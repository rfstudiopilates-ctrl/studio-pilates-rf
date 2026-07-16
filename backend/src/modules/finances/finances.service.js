import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import * as financesRepository from '../finances/finances.repository.js';
import { calculateBalanceImpact, PAYMENT_METHOD_LABELS } from '../finances/finances.constants.js';
import * as clientsRepository from '../clients/clients.repository.js';
import * as plansRepository from '../plans/plans.repository.js';

export async function syncClientFinancialStatus(clientId) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client || client.status === 'suspended') {
    return;
  }

  const summary = await financesRepository.getAccountSummary(clientId);
  const nextStatus = summary.balance < 0 ? 'debt' : 'active';

  if (client.status !== nextStatus) {
    await clientsRepository.updateClient(clientId, { status: nextStatus });
  }
}

export async function createMovement(clientId, payload, adminId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const client = await clientsRepository.lockClientById(clientId, connection);

    if (!client) {
      throw createAppError('Cliente no encontrado', 404);
    }

    const currentBalance = await financesRepository.getLatestBalanceForUpdate(
      clientId,
      connection
    );
    const impact = calculateBalanceImpact(payload.type, payload.amount);
    const balanceAfter = Number((currentBalance + impact).toFixed(2));

    const movement = await financesRepository.createMovement(
      {
        clientId,
        type: payload.type,
        amount: payload.amount,
        description: payload.description.trim(),
        paymentMethod: payload.paymentMethod || null,
        balanceAfter,
        createdByAdminId: adminId,
      },
      connection
    );

    await connection.commit();

    await syncClientFinancialStatus(clientId);

    await clientsRepository.createClientHistory({
      clientId,
      actionType: 'client_updated',
      description: `Movimiento financiero registrado: ${payload.description}`,
      metadata: {
        movementType: payload.type,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod || null,
        balanceAfter,
      },
      performedById: adminId,
    });

    return movement;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createPlanDebtMovement({
  clientId,
  amount,
  description,
  referenceId,
  adminId,
  connection = pool,
}) {
  const currentBalance = await financesRepository.getLatestBalanceForUpdate(clientId, connection);
  const balanceAfter = Number((currentBalance - amount).toFixed(2));

  const movement = await financesRepository.createMovement(
    {
      clientId,
      type: 'debt',
      amount,
      description,
      referenceType: 'client_plan',
      referenceId,
      balanceAfter,
      createdByAdminId: adminId,
    },
    connection
  );

  return movement;
}

export async function createPlanPaymentMovement({
  clientId,
  amount,
  description,
  paymentMethod,
  referenceId,
  adminId,
  connection = pool,
}) {
  const currentBalance = await financesRepository.getLatestBalanceForUpdate(clientId, connection);
  const balanceAfter = Number((currentBalance + amount).toFixed(2));

  const movement = await financesRepository.createMovement(
    {
      clientId,
      type: 'payment',
      amount,
      description,
      paymentMethod,
      referenceType: 'client_plan',
      referenceId,
      balanceAfter,
      createdByAdminId: adminId,
    },
    connection
  );

  return movement;
}

export async function createPlanRefundMovements({
  clientId,
  amount,
  planLabel,
  paymentMethod,
  referenceId,
  adminId,
  mode,
  connection = pool,
}) {
  const safeAmount = Number(amount);

  if (mode === 'cash') {
    const balanceBeforeDebit = await financesRepository.getLatestBalanceForUpdate(
      clientId,
      connection
    );
    const afterDebit = Number((balanceBeforeDebit - safeAmount).toFixed(2));

    const refundMovement = await financesRepository.createMovement(
      {
        clientId,
        type: 'debit',
        amount: safeAmount,
        description: `Devolución plan: ${planLabel}`,
        paymentMethod,
        referenceType: 'plan_refund',
        referenceId,
        balanceAfter: afterDebit,
        createdByAdminId: adminId,
      },
      connection
    );

    // Neutraliza el impacto en el saldo del cliente (ya había pagado).
    const afterCredit = Number((afterDebit + safeAmount).toFixed(2));
    const adjustmentMovement = await financesRepository.createMovement(
      {
        clientId,
        type: 'credit',
        amount: safeAmount,
        description: `Ajuste por devolución plan: ${planLabel}`,
        referenceType: 'plan_refund',
        referenceId,
        balanceAfter: afterCredit,
        createdByAdminId: adminId,
      },
      connection
    );

    return { refundMovement, adjustmentMovement, mode };
  }

  const currentBalance = await financesRepository.getLatestBalanceForUpdate(clientId, connection);
  const balanceAfter = Number((currentBalance + safeAmount).toFixed(2));

  const forgiveMovement = await financesRepository.createMovement(
    {
      clientId,
      type: 'credit',
      amount: safeAmount,
      description: `Condonación por cancelación de plan: ${planLabel}`,
      referenceType: 'plan_forgive',
      referenceId,
      balanceAfter,
      createdByAdminId: adminId,
    },
    connection
  );

  return { forgiveMovement, mode };
}

export async function settlePlanAssignment(clientId, payload, adminId) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  const clientPlan = await plansRepository.findClientPlanById(payload.clientPlanId);

  if (!clientPlan || clientPlan.clientId !== clientId) {
    throw createAppError('Asignación de plan no encontrada', 404);
  }

  const amount = Number(clientPlan.priceSnapshot);

  if (amount <= 0) {
    return {
      action: payload.action,
      amount: 0,
      debtMovement: null,
      paymentMovement: null,
      message: 'Plan asignado sin monto a registrar.',
    };
  }

  const planLabel = clientPlan.planName || 'plan';
  const debtDescription = `Asignación de plan: ${planLabel}`;
  const paymentDescription = `Pago plan: ${planLabel}`;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const debtMovement = await createPlanDebtMovement({
      clientId,
      amount,
      description: debtDescription,
      referenceId: clientPlan.id,
      adminId,
      connection,
    });

    let paymentMovement = null;

    if (payload.action === 'pay') {
      paymentMovement = await createPlanPaymentMovement({
        clientId,
        amount,
        description: paymentDescription,
        paymentMethod: payload.paymentMethod,
        referenceId: clientPlan.id,
        adminId,
        connection,
      });
    }

    await connection.commit();

    await syncClientFinancialStatus(clientId);

    const methodLabel = payload.paymentMethod
      ? PAYMENT_METHOD_LABELS[payload.paymentMethod]
      : null;

    await clientsRepository.createClientHistory({
      clientId,
      actionType: 'client_updated',
      description:
        payload.action === 'pay'
          ? `Pago de plan registrado (${methodLabel}): ${planLabel}`
          : `Plan cargado a cuenta corriente: ${planLabel}`,
      metadata: {
        clientPlanId: clientPlan.id,
        amount,
        action: payload.action,
        paymentMethod: payload.paymentMethod || null,
        debtMovementId: debtMovement.id,
        paymentMovementId: paymentMovement?.id || null,
      },
      performedById: adminId,
    });

    return {
      action: payload.action,
      amount,
      debtMovement,
      paymentMovement,
      message:
        payload.action === 'pay'
          ? `Pago registrado con ${methodLabel}.`
          : 'Plan cargado a cuenta corriente.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getClientFinances(clientId, query) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  const summary = await financesRepository.getAccountSummary(clientId);
  const movements = await financesRepository.listMovements(clientId, query);

  return { summary, movements };
}

export async function getClientAccountForClientRole(clientId) {
  const summary = await financesRepository.getAccountSummary(clientId);
  const movements = await financesRepository.listMovements(clientId, { page: 1, limit: 10 });

  return { summary, recentMovements: movements.items };
}

export async function listAllMovements(query) {
  return financesRepository.listAllMovements(query);
}

export async function getFinanceOverview(query) {
  return financesRepository.getFinanceOverview(query);
}
