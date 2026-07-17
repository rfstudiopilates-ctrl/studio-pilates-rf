import { pool } from '../../config/database.js';

export async function findAdminByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, email, username, password_hash, full_name, role, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

export async function findAdminByUsername(username) {
  const [rows] = await pool.query(
    `SELECT id, email, username, password_hash, full_name, role, is_active, pwa_installed_at
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

export async function findAdminById(id) {
  const [rows] = await pool.query(
    `SELECT id, email, username, full_name, role, is_active, last_login_at, pwa_installed_at, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function findAdminWithPasswordById(id) {
  const [rows] = await pool.query(
    `SELECT id, email, username, password_hash, full_name, role, is_active
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function updateAdminLastLogin(userId) {
  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
}

export async function updateAdminPassword(userId, passwordHash) {
  await pool.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    passwordHash,
    userId,
  ]);
}

export async function markAdminPwaInstalled(userId) {
  await pool.query(
    `UPDATE users
     SET pwa_installed_at = COALESCE(pwa_installed_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId]
  );
}

export async function createRefreshToken({ subjectType, subjectId, tokenHash, expiresAt }) {
  await pool.query(
    `INSERT INTO refresh_tokens (subject_type, subject_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [subjectType, subjectId, tokenHash, expiresAt]
  );
}

export async function findRefreshTokenByHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, subject_type, subject_id, token_hash, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

export async function revokeRefreshToken(tokenHash) {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [tokenHash]
  );
}

export async function revokeAllRefreshTokens(subjectType, subjectId) {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE subject_type = ? AND subject_id = ? AND revoked_at IS NULL`,
    [subjectType, subjectId]
  );
}

export async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );
}

export async function invalidatePasswordResetTokens(userId) {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND used_at IS NULL`,
    [userId]
  );
}

export async function findPasswordResetTokenByHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

export async function markPasswordResetTokenUsed(tokenHash) {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token_hash = ?`,
    [tokenHash]
  );
}

export async function createAdmin({ email, username, passwordHash, fullName }) {
  const [result] = await pool.query(
    `INSERT INTO users (email, username, password_hash, full_name, role, is_active)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    [email, username, passwordHash, fullName]
  );

  return result.insertId;
}
