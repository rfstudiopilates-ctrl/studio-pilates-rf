import { pool } from '../../config/database.js';
import { sqlDateInArgentina } from '../../utils/dates.js';
import { resolveDateRange } from '../dashboard/dashboard.repository.js';
import * as dashboardRepository from '../dashboard/dashboard.repository.js';

function mapReceiptRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    movementId: row.movement_id,
    receiptNumber: row.receipt_number,
    issuedAt: row.issued_at,
    issuedByAdminId: row.issued_by_admin_id,
  };
}

function mapMovementRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    balanceAfter: Number(row.balance_after),
    createdAt: row.created_at,
  };
}

export { resolveDateRange };

export async function getRecoveryStats(from, to) {
  const [summaryRows] = await pool.query(
    `SELECT status, COUNT(*) AS total
     FROM recovery_credits
     WHERE ${sqlDateInArgentina('created_at')} BETWEEN ? AND ?
     GROUP BY status`,
    [from, to]
  );

  const [items] = await pool.query(
    `SELECT rc.id, rc.status, rc.expires_at, rc.created_at,
            c.full_name AS client_name
     FROM recovery_credits rc
     INNER JOIN clients c ON c.id = rc.client_id
     WHERE ${sqlDateInArgentina('rc.created_at')} BETWEEN ? AND ?
     ORDER BY rc.created_at DESC
     LIMIT 100`,
    [from, to]
  );

  const byStatus = summaryRows.reduce((acc, row) => {
    acc[row.status] = Number(row.total);
    return acc;
  }, {});

  return {
    total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
    available: byStatus.available || 0,
    used: byStatus.used || 0,
    expired: byStatus.expired || 0,
    byStatus: summaryRows.map((row) => ({
      status: row.status,
      count: Number(row.total),
    })),
    items: items.map((row) => ({
      id: row.id,
      clientName: row.client_name,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
  };
}

export async function getTopSchedules(from, to, limit = 10) {
  const [rows] = await pool.query(
    `SELECT
       st.day_of_week,
       st.start_time,
       COUNT(r.id) AS reservations
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     INNER JOIN schedule_templates st ON st.id = gc.schedule_template_id
     WHERE gc.class_date BETWEEN ? AND ?
       AND r.status IN ('confirmed', 'completed')
     GROUP BY st.id, st.day_of_week, st.start_time
     ORDER BY reservations DESC
     LIMIT ?`,
    [from, to, limit]
  );

  return rows.map((row) => ({
    dayOfWeek: row.day_of_week,
    startTime: row.start_time?.slice?.(0, 5) || row.start_time,
    reservations: Number(row.reservations),
  }));
}

export async function getClientsWithDebt() {
  const [rows] = await pool.query(
    `SELECT c.id, c.full_name, c.phone, c.status,
            latest.balance_after AS balance
     FROM clients c
     INNER JOIN (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) latest_ids ON latest_ids.max_id = fm.id
     ) latest ON latest.client_id = c.id
     WHERE c.deleted_at IS NULL
       AND latest.balance_after < 0
     ORDER BY balance ASC, c.full_name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    status: row.status,
    balance: Number(row.balance),
    outstandingDebt: Number((-Number(row.balance)).toFixed(2)),
  }));
}

export async function getPaymentMovements(from, to) {
  const [rows] = await pool.query(
    `SELECT fm.id, fm.amount, fm.description, fm.created_at,
            c.full_name AS client_name
     FROM financial_movements fm
     INNER JOIN clients c ON c.id = fm.client_id
     WHERE fm.type = 'payment'
       AND ${sqlDateInArgentina('fm.created_at')} BETWEEN ? AND ?
     ORDER BY fm.created_at DESC`,
    [from, to]
  );

  return rows.map((row) => ({
    id: row.id,
    clientName: row.client_name,
    amount: Number(row.amount),
    description: row.description,
    createdAt: row.created_at,
  }));
}

export async function getMovementForReceipt(movementId) {
  const [rows] = await pool.query(
    `SELECT fm.*, c.full_name AS client_name, c.phone AS client_phone
     FROM financial_movements fm
     INNER JOIN clients c ON c.id = fm.client_id
     WHERE fm.id = ? AND c.deleted_at IS NULL`,
    [movementId]
  );

  return mapMovementRow(rows[0]);
}

export async function findReceiptByMovementId(movementId) {
  const [rows] = await pool.query(
    'SELECT * FROM payment_receipts WHERE movement_id = ? LIMIT 1',
    [movementId]
  );

  return mapReceiptRow(rows[0]);
}

export async function getOrCreateReceipt(movementId, adminId) {
  const existing = await findReceiptByMovementId(movementId);

  if (existing) {
    return existing;
  }

  const year = new Date().getFullYear();
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [lockedExisting] = await connection.query(
        'SELECT * FROM payment_receipts WHERE movement_id = ? LIMIT 1 FOR UPDATE',
        [movementId]
      );

      if (lockedExisting[0]) {
        await connection.commit();
        return mapReceiptRow(lockedExisting[0]);
      }

      // Bloquea filas del año para serializar el próximo número.
      const [lastRows] = await connection.query(
        `SELECT receipt_number
         FROM payment_receipts
         WHERE receipt_number LIKE ?
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [`CP-${year}-%`]
      );

      let nextNumber = 1;
      if (lastRows[0]?.receipt_number) {
        const match = String(lastRows[0].receipt_number).match(/(\d+)$/);
        nextNumber = match ? Number(match[1]) + 1 : 1;
      }

      const receiptNumber = `CP-${year}-${String(nextNumber).padStart(6, '0')}`;

      const [result] = await connection.query(
        `INSERT INTO payment_receipts (movement_id, receipt_number, issued_by_admin_id)
         VALUES (?, ?, ?)`,
        [movementId, receiptNumber, adminId || null]
      );

      const [rows] = await connection.query('SELECT * FROM payment_receipts WHERE id = ?', [
        result.insertId,
      ]);

      await connection.commit();
      return mapReceiptRow(rows[0]);
    } catch (error) {
      await connection.rollback();

      // Choque de UNIQUE receipt_number / movement_id: reintentar.
      if (error?.code === 'ER_DUP_ENTRY' && attempt < maxAttempts - 1) {
        continue;
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  throw new Error('No se pudo emitir el comprobante. Reintentá.');
}

export async function buildReportData(type, dateQuery) {
  const range = resolveDateRange(dateQuery);
  const { from, to } = range;

  switch (type) {
    case 'summary':
      return {
        range,
        clients: await dashboardRepository.getClientStats(),
        finances: await dashboardRepository.getFinanceStats(from, to),
        occupancy: await dashboardRepository.getClassOccupancyStats(from, to),
        reservations: await dashboardRepository.getReservationStats(from, to),
        plans: await dashboardRepository.getPlanStats(),
        schedules: await getTopSchedules(from, to),
        recoveries: await getRecoveryStats(from, to),
        topClasses: await dashboardRepository.getTopClasses(from, to),
      };

    case 'clients':
      return {
        range,
        stats: await dashboardRepository.getClientStats(),
        clientsWithDebt: await getClientsWithDebt(),
      };

    case 'finances':
      return {
        range,
        stats: await dashboardRepository.getFinanceStats(from, to),
        payments: await getPaymentMovements(from, to),
      };

    case 'occupancy':
      return {
        range,
        stats: await dashboardRepository.getClassOccupancyStats(from, to),
        topClasses: await dashboardRepository.getTopClasses(from, to, 10),
      };

    case 'reservations':
      return {
        range,
        stats: await dashboardRepository.getReservationStats(from, to),
      };

    case 'plans':
      return {
        range,
        stats: await dashboardRepository.getPlanStats(),
      };

    case 'schedules':
      return {
        range,
        items: await getTopSchedules(from, to, 20),
      };

    case 'recoveries':
      return {
        range,
        stats: await getRecoveryStats(from, to),
      };

    default:
      return null;
  }
}
