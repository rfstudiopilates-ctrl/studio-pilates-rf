import { pool } from '../../config/database.js';
import { sqlDateInArgentina } from '../../utils/dates.js';

function mapMovementRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || undefined,
    clientUsername: row.client_username || undefined,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    paymentMethod: row.payment_method || null,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    balanceAfter: Number(row.balance_after),
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
  };
}

export async function getLatestBalance(clientId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT balance_after
     FROM financial_movements
     WHERE client_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [clientId]
  );

  return rows[0] ? Number(rows[0].balance_after) : 0;
}

/** Lee el saldo bloqueando la última fila del ledger (o ningún row si no hay movimientos). */
export async function getLatestBalanceForUpdate(clientId, connection) {
  const [rows] = await connection.query(
    `SELECT balance_after
     FROM financial_movements
     WHERE client_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1
     FOR UPDATE`,
    [clientId]
  );

  return rows[0] ? Number(rows[0].balance_after) : 0;
}

export async function getPlanFinancialTotals(clientPlanId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'payment' AND reference_type = 'client_plan' THEN amount ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN type = 'debt' AND reference_type = 'client_plan' THEN amount ELSE 0 END), 0) AS debted,
      COALESCE(SUM(CASE WHEN type = 'debit' AND reference_type = 'plan_refund' THEN amount ELSE 0 END), 0) AS refunded,
      COALESCE(SUM(CASE WHEN type = 'credit' AND reference_type = 'plan_forgive' THEN amount ELSE 0 END), 0) AS forgiven
     FROM financial_movements
     WHERE reference_id = ?
       AND reference_type IN ('client_plan', 'plan_refund', 'plan_forgive')`,
    [clientPlanId]
  );

  const paid = Number(rows[0]?.paid || 0);
  const debted = Number(rows[0]?.debted || 0);
  const refunded = Number(rows[0]?.refunded || 0);
  const forgiven = Number(rows[0]?.forgiven || 0);
  const maxCashRefund = Math.max(0, Number((paid - refunded).toFixed(2)));
  const maxForgive = Math.max(0, Number((debted - paid - forgiven).toFixed(2)));

  return {
    paid,
    debted,
    refunded,
    forgiven,
    maxCashRefund,
    maxForgive,
    refundMode: maxCashRefund > 0 ? 'cash' : maxForgive > 0 ? 'forgive' : 'none',
  };
}

export async function createMovement(data, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO financial_movements (
      client_id, type, amount, description, payment_method,
      reference_type, reference_id, balance_after, created_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.clientId,
      data.type,
      data.amount,
      data.description,
      data.paymentMethod || null,
      data.referenceType || null,
      data.referenceId || null,
      data.balanceAfter,
      data.createdByAdminId || null,
    ]
  );

  const [rows] = await connection.query('SELECT * FROM financial_movements WHERE id = ?', [
    result.insertId,
  ]);

  return mapMovementRow(rows[0]);
}

export async function listMovements(clientId, { page, limit, type, paymentMethod }) {
  const conditions = ['fm.client_id = ?'];
  const params = [clientId];

  if (type) {
    conditions.push('fm.type = ?');
    params.push(type);
  }

  if (paymentMethod) {
    conditions.push('fm.payment_method = ?');
    params.push(paymentMethod);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM financial_movements fm ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT fm.*
     FROM financial_movements fm
     ${whereClause}
     ORDER BY fm.created_at DESC, fm.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapMovementRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function listAllMovements({ page, limit, type, paymentMethod, q, from, to }) {
  const conditions = ['1 = 1'];
  const params = [];

  if (type) {
    conditions.push('fm.type = ?');
    params.push(type);
  }

  if (paymentMethod) {
    conditions.push('fm.payment_method = ?');
    params.push(paymentMethod);
  }

  if (q) {
    conditions.push('(c.full_name LIKE ? OR c.username LIKE ? OR fm.description LIKE ?)');
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  if (from) {
    conditions.push(`${sqlDateInArgentina('fm.created_at')} >= ?`);
    params.push(from);
  }

  if (to) {
    conditions.push(`${sqlDateInArgentina('fm.created_at')} <= ?`);
    params.push(to);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM financial_movements fm
     INNER JOIN clients c ON c.id = fm.client_id
     ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT fm.*, c.full_name AS client_name, c.username AS client_username
     FROM financial_movements fm
     INNER JOIN clients c ON c.id = fm.client_id
     ${whereClause}
     ORDER BY fm.created_at DESC, fm.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapMovementRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function getAccountSummary(clientId) {
  const balance = await getLatestBalance(clientId);

  const [totals] = await pool.query(
    `SELECT
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) AS total_payments,
      SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) AS total_debts,
      SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credits,
      SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debits,
      COUNT(*) AS total_movements
     FROM financial_movements
     WHERE client_id = ?`,
    [clientId]
  );

  const row = totals[0];
  const outstandingDebt = Math.max(0, Number((-balance).toFixed(2)));

  return {
    balance,
    accountStatus: balance < 0 ? 'debt' : 'active',
    outstandingDebt,
    // KPI de deuda pendiente (no el histórico de cargos).
    totalDebts: outstandingDebt,
    totalDebtsGenerated: Number(row.total_debts || 0),
    totalPayments: Number(row.total_payments || 0),
    totalCredits: Number(row.total_credits || 0),
    totalDebits: Number(row.total_debits || 0),
    totalMovements: Number(row.total_movements || 0),
  };
}

export async function listDebtors() {
  const [rows] = await pool.query(
    `SELECT
       c.id AS client_id,
       c.full_name AS client_name,
       c.username AS client_username,
       c.phone AS client_phone,
       c.status AS client_status,
       latest.balance_after AS balance
     FROM clients c
     INNER JOIN (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest ON latest.client_id = c.id
     WHERE c.deleted_at IS NULL
       AND latest.balance_after < 0
     ORDER BY latest.balance_after ASC, c.full_name ASC`
  );

  return rows.map((row) => {
    const balance = Number(row.balance);
    return {
      clientId: row.client_id,
      clientName: row.client_name,
      clientUsername: row.client_username,
      clientPhone: row.client_phone || null,
      clientStatus: row.client_status,
      balance,
      outstandingDebt: Number((-balance).toFixed(2)),
    };
  });
}

export async function getOutstandingDebtTotals() {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN latest.balance_after < 0 THEN -latest.balance_after ELSE 0 END), 0)
         AS outstanding_debt_total,
       COALESCE(SUM(CASE WHEN latest.balance_after < 0 THEN 1 ELSE 0 END), 0)
         AS clients_with_debt
     FROM (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest
     INNER JOIN clients c ON c.id = latest.client_id AND c.deleted_at IS NULL`
  );

  return {
    outstandingDebtTotal: Number(rows[0]?.outstanding_debt_total || 0),
    clientsWithDebt: Number(rows[0]?.clients_with_debt || 0),
  };
}

/** Alinea status debt/active con el saldo real (no toca suspended). */
export async function reconcileClientDebtStatuses() {
  await pool.query(
    `UPDATE clients c
     INNER JOIN (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest ON latest.client_id = c.id
     SET c.status = 'debt'
     WHERE c.deleted_at IS NULL
       AND c.status NOT IN ('suspended', 'debt')
       AND latest.balance_after < 0`
  );

  await pool.query(
    `UPDATE clients c
     LEFT JOIN (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest ON latest.client_id = c.id
     SET c.status = 'active'
     WHERE c.deleted_at IS NULL
       AND c.status = 'debt'
       AND (latest.balance_after IS NULL OR latest.balance_after >= 0)`
  );
}

export async function getFinanceOverview({ from, to }) {
  await reconcileClientDebtStatuses();

  const conditions = ['1 = 1'];
  const params = [];

  if (from) {
    conditions.push(`${sqlDateInArgentina('created_at')} >= ?`);
    params.push(from);
  }

  if (to) {
    conditions.push(`${sqlDateInArgentina('created_at')} <= ?`);
    params.push(to);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [totalsRows] = await pool.query(
    `SELECT
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) AS total_payments,
      SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) AS total_debts_generated,
      SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credits,
      SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debits,
      SUM(CASE WHEN type = 'debit' AND reference_type = 'plan_refund' THEN amount ELSE 0 END) AS total_refunds,
      COUNT(*) AS total_movements,
      COUNT(DISTINCT client_id) AS clients_with_movements
     FROM financial_movements
     ${whereClause}`,
    params
  );

  const [byMethodRows] = await pool.query(
    `SELECT
      payment_method AS method,
      COUNT(*) AS count,
      SUM(
        CASE
          WHEN type = 'payment' THEN amount
          WHEN type = 'debit' AND reference_type = 'plan_refund' THEN -amount
          ELSE 0
        END
      ) AS total
     FROM financial_movements
     ${whereClause}
       AND payment_method IS NOT NULL
       AND (
         type = 'payment'
         OR (type = 'debit' AND reference_type = 'plan_refund')
       )
     GROUP BY payment_method
     ORDER BY total DESC`,
    params
  );

  const [byDayRows] = await pool.query(
    `SELECT
      ${sqlDateInArgentina('created_at')} AS date,
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END)
        - SUM(CASE WHEN type = 'debit' AND reference_type = 'plan_refund' THEN amount ELSE 0 END) AS payments,
      SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) AS debts
     FROM financial_movements
     ${whereClause}
     GROUP BY ${sqlDateInArgentina('created_at')}
     ORDER BY date ASC`,
    params
  );

  const outstanding = await getOutstandingDebtTotals();
  const debtors = await listDebtors();

  const totals = totalsRows[0];
  const grossPayments = Number(totals.total_payments || 0);
  const totalRefunds = Number(totals.total_refunds || 0);

  return {
    totals: {
      totalPayments: Number((grossPayments - totalRefunds).toFixed(2)),
      totalGrossPayments: grossPayments,
      totalRefunds,
      // Deuda pendiente actual (suma de saldos negativos).
      totalDebts: outstanding.outstandingDebtTotal,
      outstandingDebtTotal: outstanding.outstandingDebtTotal,
      // Cargos generados en el período (métrica de actividad).
      totalDebtsGenerated: Number(totals.total_debts_generated || 0),
      totalCredits: Number(totals.total_credits || 0),
      totalDebits: Number(totals.total_debits || 0),
      totalMovements: Number(totals.total_movements || 0),
      clientsWithMovements: Number(totals.clients_with_movements || 0),
      clientsWithDebt: outstanding.clientsWithDebt,
    },
    debtors,
    byPaymentMethod: byMethodRows.map((row) => ({
      method: row.method,
      count: Number(row.count),
      total: Number(row.total),
    })),
    byDay: byDayRows.map((row) => ({
      date:
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10),
      payments: Number(row.payments || 0),
      debts: Number(row.debts || 0),
    })),
  };
}
