import { pool } from '../../config/database.js';

function mapAdminRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdmins({ q, isActive, page = 1, limit = 50 }) {
  const where = ["role = 'admin'"];
  const values = [];

  if (q?.trim()) {
    where.push('(full_name LIKE ? OR username LIKE ? OR email LIKE ?)');
    const like = `%${q.trim()}%`;
    values.push(like, like, like);
  }

  if (isActive === true || isActive === false) {
    where.push('is_active = ?');
    values.push(isActive ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`,
    values
  );

  const [rows] = await pool.query(
    `SELECT id, email, username, full_name, role, is_active, last_login_at, created_at, updated_at
     FROM users
     ${whereSql}
     ORDER BY is_active DESC, full_name ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    items: rows.map(mapAdminRow),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function findAdminById(id) {
  const [rows] = await pool.query(
    `SELECT id, email, username, full_name, role, is_active, last_login_at, created_at, updated_at
     FROM users
     WHERE id = ? AND role = 'admin'
     LIMIT 1`,
    [id]
  );

  return mapAdminRow(rows[0]);
}

export async function findAdminByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, email, username, full_name, role, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return mapAdminRow(rows[0]);
}

export async function findAdminByUsername(username) {
  const [rows] = await pool.query(
    `SELECT id, email, username, full_name, role, is_active
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  return mapAdminRow(rows[0]);
}

export async function countActiveAdmins() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role = 'admin' AND is_active = 1`
  );

  return Number(rows[0].total);
}

export async function createAdmin({ email, username, passwordHash, fullName }) {
  const [result] = await pool.query(
    `INSERT INTO users (email, username, password_hash, full_name, role, is_active)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    [email, username, passwordHash, fullName]
  );

  return findAdminById(result.insertId);
}

export async function updateAdmin(id, fields) {
  const updates = [];
  const values = [];

  const mapping = {
    email: 'email',
    username: 'username',
    fullName: 'full_name',
    passwordHash: 'password_hash',
    isActive: 'is_active',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (fields[key] !== undefined) {
      updates.push(`${column} = ?`);
      values.push(key === 'isActive' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  });

  if (updates.length === 0) {
    return findAdminById(id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'admin'`, [
    ...values,
    id,
  ]);

  return findAdminById(id);
}
