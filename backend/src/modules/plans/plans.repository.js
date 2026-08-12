import { pool } from '../../config/database.js';
import {
  FIXED_SCHEDULE_GRACE_DAYS,
  addDaysToDate,
  getTodayInArgentina,
  toDateString,
} from '../../utils/dates.js';

function mapPlanRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    weeklyClasses: row.weekly_classes,
    monthlyClasses: row.monthly_classes,
    durationDays: row.duration_days,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientPlanRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    clientId: row.client_id,
    planId: row.plan_id,
    planName: row.plan_name,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    status: row.status,
    priceSnapshot: Number(row.price_snapshot),
    weeklyClassesLimit: row.weekly_classes_limit,
    monthlyClassesLimit: row.monthly_classes_limit,
    weeklyClassesUsed: row.weekly_classes_used,
    monthlyClassesUsed: row.monthly_classes_used,
    weekResetAt: toDateString(row.week_reset_at),
    monthResetAt: toDateString(row.month_reset_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlans({ q, status, page, limit }) {
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('name LIKE ?');
    params.push(`%${q}%`);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM plans ${whereClause}`, params);

  const [rows] = await pool.query(
    `SELECT * FROM plans ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapPlanRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function findPlanById(id) {
  const [rows] = await pool.query('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
  return mapPlanRow(rows[0]);
}

export async function findActivePlanById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM plans WHERE id = ? AND status = 'active' LIMIT 1",
    [id]
  );
  return mapPlanRow(rows[0]);
}

export async function createPlan(data) {
  const [result] = await pool.query(
    `INSERT INTO plans (name, description, price, weekly_classes, monthly_classes, duration_days, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || null,
      data.price,
      data.weeklyClasses,
      data.monthlyClasses,
      data.durationDays,
      data.status,
    ]
  );

  return findPlanById(result.insertId);
}

export async function updatePlan(id, data) {
  const fields = [];
  const values = [];
  const mapping = {
    name: 'name',
    description: 'description',
    price: 'price',
    weeklyClasses: 'weekly_classes',
    monthlyClasses: 'monthly_classes',
    durationDays: 'duration_days',
    status: 'status',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (data[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(data[key]);
    }
  });

  if (fields.length === 0) {
    return findPlanById(id);
  }

  await pool.query(`UPDATE plans SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  return findPlanById(id);
}

export async function countActiveClientPlansByPlanId(planId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM client_plans WHERE plan_id = ? AND status = 'active'",
    [planId]
  );
  return rows[0].total;
}

export async function countClientPlansByPlanId(planId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM client_plans WHERE plan_id = ?',
    [planId]
  );
  return Number(rows[0].total);
}

export async function hardDeletePlan(id) {
  await pool.query('DELETE FROM plans WHERE id = ?', [id]);
}

export async function findActiveClientPlan(clientId, connection = pool) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.client_id = ? AND cp.status = 'active'
     ORDER BY cp.created_at DESC
     LIMIT 1`,
    [clientId]
  );

  return mapClientPlanRow(rows[0]);
}

export async function findActiveClientPlanForUpdate(clientId, connection) {
  const [rows] = await connection.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.client_id = ? AND cp.status = 'active'
     ORDER BY cp.created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [clientId]
  );

  return mapClientPlanRow(rows[0]);
}

/**
 * Plan usable para reservar: activo, o expired todavía en gracia (recuperar cupos).
 */
export async function findBookableClientPlanForUpdate(clientId, connection) {
  const active = await findActiveClientPlanForUpdate(clientId, connection);
  if (active) {
    return active;
  }

  const today = getTodayInArgentina();
  const graceFloor = addDaysToDate(today, -FIXED_SCHEDULE_GRACE_DAYS);
  const [rows] = await connection.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.client_id = ?
       AND cp.status = 'expired'
       AND cp.end_date >= ?
       AND cp.end_date < ?
     ORDER BY cp.end_date DESC, cp.id DESC
     LIMIT 1
     FOR UPDATE`,
    [clientId, graceFloor, today]
  );

  return mapClientPlanRow(rows[0]);
}

export async function findClientPlanByIdForUpdate(id, connection) {
  const [rows] = await connection.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.id = ?
     FOR UPDATE`,
    [id]
  );

  return mapClientPlanRow(rows[0]);
}

export async function listClientPlans(clientId, { page, limit }) {
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM client_plans WHERE client_id = ?',
    [clientId]
  );

  const [rows] = await pool.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.client_id = ?
     ORDER BY cp.created_at DESC
     LIMIT ? OFFSET ?`,
    [clientId, limit, offset]
  );

  return {
    items: rows.map(mapClientPlanRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function createClientPlan(data, connection = pool) {
  const db = connection || pool;
  const [result] = await db.query(
    `INSERT INTO client_plans (
      client_id, plan_id, start_date, end_date, status,
      price_snapshot, weekly_classes_limit, monthly_classes_limit,
      week_reset_at, month_reset_at
    ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [
      data.clientId,
      data.planId,
      data.startDate,
      data.endDate,
      data.priceSnapshot,
      data.weeklyClassesLimit,
      data.monthlyClassesLimit,
      data.weekResetAt,
      data.monthResetAt,
    ]
  );

  const [rows] = await db.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.id = ?`,
    [result.insertId]
  );

  return mapClientPlanRow(rows[0]);
}

export async function cancelActiveClientPlans(clientId, connection = pool) {
  await connection.query(
    "UPDATE client_plans SET status = 'cancelled' WHERE client_id = ? AND status = 'active'",
    [clientId]
  );
}

export async function findClientPlanById(id, connection = pool) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.id = ?`,
    [id]
  );

  return mapClientPlanRow(rows[0]);
}

export async function updateClientPlanUsage(id, data, connection = pool) {
  const db = connection || pool;
  await db.query(
    `UPDATE client_plans
     SET weekly_classes_used = ?, monthly_classes_used = ?,
         week_reset_at = ?, month_reset_at = ?
     WHERE id = ?`,
    [data.weeklyClassesUsed, data.monthlyClassesUsed, data.weekResetAt, data.monthResetAt, id]
  );
}

export async function sumUsageAdjustments(clientPlanId, connection = pool) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(quantity), 0) AS total
     FROM client_plan_usage_adjustments
     WHERE client_plan_id = ?`,
    [clientPlanId]
  );

  return Number(rows[0]?.total || 0);
}

export async function createUsageAdjustment(data, connection = pool) {
  const db = connection || pool;
  const [result] = await db.query(
    `INSERT INTO client_plan_usage_adjustments (
      client_plan_id, quantity, reason, created_by_admin_id
    ) VALUES (?, ?, ?, ?)`,
    [data.clientPlanId, data.quantity, data.reason, data.createdByAdminId || null]
  );

  const [rows] = await db.query(
    `SELECT id, client_plan_id, quantity, reason, created_by_admin_id, created_at
     FROM client_plan_usage_adjustments
     WHERE id = ?`,
    [result.insertId]
  );

  const row = rows[0];
  return {
    id: row.id,
    clientPlanId: row.client_plan_id,
    quantity: Number(row.quantity),
    reason: row.reason,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
  };
}

export async function listUsageAdjustments(clientPlanId, connection = pool) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT id, client_plan_id, quantity, reason, created_by_admin_id, created_at
     FROM client_plan_usage_adjustments
     WHERE client_plan_id = ?
     ORDER BY created_at DESC, id DESC`,
    [clientPlanId]
  );

  return rows.map((row) => ({
    id: row.id,
    clientPlanId: row.client_plan_id,
    quantity: Number(row.quantity),
    reason: row.reason,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
  }));
}

export async function expireClientPlans() {
  const today = getTodayInArgentina();
  await pool.query(
    "UPDATE client_plans SET status = 'expired' WHERE status = 'active' AND end_date < ?",
    [today]
  );
}

export async function updateClientPlanStatus(id, status, connection = pool) {
  const db = connection || pool;
  await db.query('UPDATE client_plans SET status = ? WHERE id = ?', [status, id]);
  return findClientPlanById(id, db);
}

/** Plan activo, o el último expired aún dentro de la gracia de fijos. */
export async function findRenewableClientPlan(clientId, connection = pool) {
  const db = connection || pool;
  const today = getTodayInArgentina();
  const graceFloor = addDaysToDate(today, -FIXED_SCHEDULE_GRACE_DAYS);

  const active = await findActiveClientPlan(clientId, db);
  if (active) {
    return active;
  }

  const [rows] = await db.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.client_id = ?
       AND cp.status = 'expired'
       AND cp.end_date >= ?
       AND cp.end_date < ?
     ORDER BY cp.end_date DESC, cp.id DESC
     LIMIT 1`,
    [clientId, graceFloor, today]
  );

  return mapClientPlanRow(rows[0]);
}

/** Planes expired cuya gracia de fijos ya terminó (día 8+). */
export async function listExpiredClientPlansPastGrace(connection = pool) {
  const db = connection || pool;
  const today = getTodayInArgentina();
  // end_date <= today - (GRACE + 1)  ⇒  daysSinceExpiry > GRACE
  const pastGraceEnd = addDaysToDate(today, -(FIXED_SCHEDULE_GRACE_DAYS + 1));

  const [rows] = await db.query(
    `SELECT cp.*, p.name AS plan_name
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.status = 'expired'
       AND cp.end_date <= ?
     ORDER BY cp.end_date ASC, cp.id ASC`,
    [pastGraceEnd]
  );

  return rows.map(mapClientPlanRow);
}
