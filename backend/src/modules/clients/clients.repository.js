import { pool } from '../../config/database.js';
import { sqlDateInArgentina } from '../../utils/dates.js';

function mapClientRow(row) {
  if (!row) {
    return null;
  }

  const balance =
    row.balance_after === null || row.balance_after === undefined
      ? null
      : Number(row.balance_after);
  const outstandingDebt =
    balance != null && balance < 0 ? Number((-balance).toFixed(2)) : 0;

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    phone: row.phone,
    status: row.status,
    internalNotes: row.internal_notes,
    lastLoginAt: row.last_login_at,
    pwaInstalled: Boolean(row.pwa_installed_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activePlanId: row.active_plan_id ?? null,
    activePlanName: row.active_plan_name ?? null,
    balance,
    outstandingDebt,
  };
}

function mapHistoryRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    actionType: row.action_type,
    description: row.description,
    metadata: row.metadata ? (typeof row.metadata === 'object' ? row.metadata : JSON.parse(row.metadata)) : null,
    performedByType: row.performed_by_type,
    performedById: row.performed_by_id,
    createdAt: row.created_at,
  };
}

export async function findClientById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, full_name, phone, status, internal_notes, last_login_at, pwa_installed_at, created_at, updated_at
     FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );

  return mapClientRow(rows[0]);
}

/** Serializa operaciones concurrentes del mismo cliente (reservas / finanzas). */
export async function lockClientById(id, connection) {
  const [rows] = await connection.query(
    `SELECT id, username, full_name, phone, status, internal_notes, last_login_at, created_at, updated_at
     FROM clients
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return mapClientRow(rows[0]);
}

export async function findClientByUsername(username) {
  const [rows] = await pool.query(
    `SELECT id, username, password_hash, full_name, phone, status, internal_notes, last_login_at, pwa_installed_at, created_at, updated_at
     FROM clients WHERE username = ? AND deleted_at IS NULL LIMIT 1`,
    [username]
  );

  return rows[0] ? { ...mapClientRow(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function findClientByPhone(phone) {
  const [rows] = await pool.query(
    `SELECT id, username, full_name, phone, status, internal_notes, last_login_at, created_at, updated_at
     FROM clients WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
    [phone]
  );

  return mapClientRow(rows[0]);
}

export async function findClientWithPasswordById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, password_hash, full_name, phone, status, internal_notes
     FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );

  return rows[0] ? { ...mapClientRow(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function listClients({
  q,
  status,
  hasLogin,
  createdFrom,
  createdTo,
  page,
  limit,
  sortBy,
  sortOrder,
}) {
  const conditions = ['c.deleted_at IS NULL'];
  const params = [];

  if (q) {
    const search = `%${q}%`;
    conditions.push('(c.full_name LIKE ? OR c.username LIKE ? OR c.phone LIKE ?)');
    params.push(search, search, search);
  }

  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }

  if (hasLogin === 'logged') {
    conditions.push('c.last_login_at IS NOT NULL');
  }

  if (hasLogin === 'never') {
    conditions.push('c.last_login_at IS NULL');
  }

  if (createdFrom) {
    conditions.push(`${sqlDateInArgentina('c.created_at')} >= ?`);
    params.push(createdFrom);
  }

  if (createdTo) {
    conditions.push(`${sqlDateInArgentina('c.created_at')} <= ?`);
    params.push(createdTo);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const sortColumns = {
    fullName: 'c.full_name',
    createdAt: 'c.created_at',
    status: 'c.status',
    username: 'c.username',
  };

  const orderColumn = sortColumns[sortBy] || 'c.created_at';
  const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM clients c ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.username,
       c.full_name,
       c.phone,
       c.status,
       c.internal_notes,
       c.last_login_at,
       c.created_at,
       c.updated_at,
       cp.id AS active_plan_id,
       p.name AS active_plan_name,
       latest.balance_after
     FROM clients c
     LEFT JOIN client_plans cp
       ON cp.id = (
         SELECT cp2.id
         FROM client_plans cp2
         WHERE cp2.client_id = c.id
           AND cp2.status = 'active'
         ORDER BY cp2.id DESC
         LIMIT 1
       )
     LEFT JOIN plans p
       ON p.id = cp.plan_id
     LEFT JOIN (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest ON latest.client_id = c.id
     ${whereClause}
     ORDER BY ${orderColumn} ${orderDirection}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapClientRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function createClient({ username, passwordHash, fullName, phone, status, internalNotes }) {
  const [result] = await pool.query(
    `INSERT INTO clients (username, password_hash, full_name, phone, status, internal_notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [username, passwordHash, fullName, phone, status, internalNotes || null]
  );

  return result.insertId;
}

export async function updateClient(id, fields) {
  const updates = [];
  const values = [];

  const mapping = {
    username: 'username',
    passwordHash: 'password_hash',
    fullName: 'full_name',
    phone: 'phone',
    status: 'status',
    internalNotes: 'internal_notes',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (fields[key] !== undefined) {
      updates.push(`${column} = ?`);
      values.push(fields[key]);
    }
  });

  if (updates.length === 0) {
    return findClientById(id);
  }

  await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);

  return findClientById(id);
}

export async function deleteClient(id) {
  const [result] = await pool.query(
    'UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return result.affectedRows > 0;
}

/**
 * ¿El cliente tiene actividad registrada (reservas, planes, pagos, etc.)?
 * Si la tiene, no se puede borrar físicamente por las FK de la base.
 */
export async function clientHasActivity(id) {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM class_reservations WHERE client_id = ?)
     + (SELECT COUNT(*) FROM client_plans WHERE client_id = ?)
     + (SELECT COUNT(*) FROM financial_movements WHERE client_id = ?)
     + (SELECT COUNT(*) FROM recovery_credits WHERE client_id = ?)
     + (SELECT COUNT(*) FROM recurring_reservations WHERE client_id = ?)
     + (SELECT COUNT(*) FROM schedule_change_requests WHERE client_id = ?) AS total`,
    [id, id, id, id, id, id]
  );

  return Number(rows[0].total) > 0;
}

/**
 * Borrado físico definitivo. Solo para cuentas sin actividad:
 * el historial se elimina por ON DELETE CASCADE.
 */
export async function hardDeleteClient(id) {
  await pool.query(
    "DELETE FROM refresh_tokens WHERE subject_type = 'client' AND subject_id = ?",
    [id]
  );
  await pool.query(
    "DELETE FROM push_subscriptions WHERE user_type = 'client' AND user_id = ?",
    [id]
  );

  const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function updateClientLastLogin(clientId) {
  await pool.query('UPDATE clients SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [clientId]);
}

export async function markClientPwaInstalled(clientId) {
  await pool.query(
    `UPDATE clients
     SET pwa_installed_at = COALESCE(pwa_installed_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    [clientId]
  );
}

export async function createClientHistory({
  clientId,
  actionType,
  description,
  metadata = null,
  performedByType = 'admin',
  performedById = null,
  connection = null,
}) {
  const db = connection || pool;
  await db.query(
    `INSERT INTO client_history
      (client_id, action_type, description, metadata, performed_by_type, performed_by_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      clientId,
      actionType,
      description,
      metadata ? JSON.stringify(metadata) : null,
      performedByType,
      performedById,
    ]
  );
}

export async function getClientHistory(clientId, { page, limit }) {
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM client_history WHERE client_id = ?',
    [clientId]
  );

  const [rows] = await pool.query(
    `SELECT id, client_id, action_type, description, metadata, performed_by_type, performed_by_id, created_at
     FROM client_history
     WHERE client_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [clientId, limit, offset]
  );

  return {
    items: rows.map(mapHistoryRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}
