import { pool } from '../../config/database.js';
import { addDaysToDate, getTodayInArgentina, toDateString } from '../../utils/dates.js';

function mapSubscriptionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userType: row.user_type,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dhKey: row.p256dh_key,
    authKey: row.auth_key,
    deviceLabel: row.device_label,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotificationLogRow(row) {
  if (!row) {
    return null;
  }

  let payload = row.payload;
  if (payload && typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  return {
    id: row.id,
    channel: row.channel,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    payload,
    whatsappPhone: row.whatsapp_phone,
    whatsappUrl: row.whatsapp_url,
    status: row.status,
    sentAt: row.sent_at,
    readAt: row.read_at || null,
    isRead: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

export async function upsertPushSubscription(data) {
  await pool.query(
    `INSERT INTO push_subscriptions (
      user_type, user_id, endpoint, p256dh_key, auth_key, device_label, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      user_type = VALUES(user_type),
      user_id = VALUES(user_id),
      p256dh_key = VALUES(p256dh_key),
      auth_key = VALUES(auth_key),
      device_label = VALUES(device_label),
      is_active = 1,
      updated_at = CURRENT_TIMESTAMP`,
    [
      data.userType,
      data.userId,
      data.endpoint,
      data.p256dhKey,
      data.authKey,
      data.deviceLabel || null,
    ]
  );

  const [rows] = await pool.query(
    'SELECT * FROM push_subscriptions WHERE endpoint = ? LIMIT 1',
    [data.endpoint]
  );

  return mapSubscriptionRow(rows[0]);
}

export async function deactivatePushSubscription(endpoint, userType, userId) {
  await pool.query(
    `UPDATE push_subscriptions
     SET is_active = 0
     WHERE endpoint = ? AND user_type = ? AND user_id = ?`,
    [endpoint, userType, userId]
  );
}

export async function listActivePushSubscriptions(userType, userId) {
  const [rows] = await pool.query(
    `SELECT * FROM push_subscriptions
     WHERE user_type = ? AND user_id = ? AND is_active = 1`,
    [userType, userId]
  );

  return rows.map(mapSubscriptionRow);
}

export async function listAdminUserIds() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = 1"
  );

  return rows.map((row) => row.id);
}

export async function createNotificationLog(data) {
  const [result] = await pool.query(
    `INSERT INTO notification_logs (
      channel, recipient_type, recipient_id, event_type, title, body,
      payload, whatsapp_phone, whatsapp_url, status, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.channel,
      data.recipientType,
      data.recipientId,
      data.eventType,
      data.title,
      data.body,
      data.payload ? JSON.stringify(data.payload) : null,
      data.whatsappPhone || null,
      data.whatsappUrl || null,
      data.status,
      data.sentAt || null,
    ]
  );

  return findNotificationLogById(result.insertId);
}

export async function findNotificationLogById(id) {
  const [rows] = await pool.query('SELECT * FROM notification_logs WHERE id = ?', [id]);
  return mapNotificationLogRow(rows[0]);
}

export async function listNotificationLogs({
  recipientType,
  recipientId,
  channel,
  status,
  eventType,
  page = 1,
  limit = 50,
}) {
  const conditions = [];
  const params = [];

  if (recipientType) {
    conditions.push('recipient_type = ?');
    params.push(recipientType);
  }

  if (recipientId) {
    conditions.push('recipient_id = ?');
    params.push(recipientId);
  }

  if (channel) {
    conditions.push('channel = ?');
    params.push(channel);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (eventType) {
    conditions.push('event_type = ?');
    params.push(eventType);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM notification_logs ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT * FROM notification_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapNotificationLogRow),
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit) || 1,
    },
  };
}

export async function markNotificationLogSent(id) {
  await pool.query(
    `UPDATE notification_logs
     SET status = 'sent', sent_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id]
  );

  return findNotificationLogById(id);
}

export async function deleteNotificationLogs({
  recipientType,
  channel,
  status,
  eventType,
} = {}) {
  const conditions = [];
  const params = [];

  if (recipientType) {
    conditions.push('recipient_type = ?');
    params.push(recipientType);
  }

  if (channel) {
    conditions.push('channel = ?');
    params.push(channel);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (eventType) {
    conditions.push('event_type = ?');
    params.push(eventType);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [result] = await pool.query(
    `DELETE FROM notification_logs ${whereClause}`,
    params
  );

  return { deleted: result.affectedRows || 0 };
}

export async function markPushSubscriptionInactive(id) {
  await pool.query('UPDATE push_subscriptions SET is_active = 0 WHERE id = ?', [id]);
}

export async function createReminderSent(reservationId, reminderType = '24h') {
  await pool.query(
    `INSERT INTO notification_reminders (reservation_id, reminder_type)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE sent_at = CURRENT_TIMESTAMP`,
    [reservationId, reminderType]
  );
}

export async function listReservationsFor24hReminder() {
  const today = getTodayInArgentina();
  const limitDate = addDaysToDate(today, 2);
  const [rows] = await pool.query(
    `SELECT r.id, r.client_id, r.status,
            c.full_name AS client_name, c.phone AS client_phone,
            gc.class_date, gc.start_time, gc.end_time
     FROM class_reservations r
     INNER JOIN clients c ON c.id = r.client_id
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     LEFT JOIN notification_reminders nr
       ON nr.reservation_id = r.id AND nr.reminder_type = '24h'
     WHERE r.status = 'confirmed'
       AND gc.status = 'scheduled'
       AND nr.id IS NULL
       AND gc.class_date >= ?
       AND gc.class_date <= ?`,
    [today, limitDate]
  );

  return rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    classDate: toDateString(row.class_date),
    startTime: row.start_time?.slice?.(0, 5) || row.start_time,
    endTime: row.end_time?.slice?.(0, 5) || row.end_time,
    status: row.status,
  }));
}

export async function listInboxNotifications({
  recipientType,
  recipientId,
  page = 1,
  limit = 30,
  unreadOnly = true,
}) {
  const offset = (page - 1) * limit;
  const params = [recipientType, Number(recipientId)];
  const unreadClause = unreadOnly ? 'AND read_at IS NULL' : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notification_logs
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       ${unreadClause}`,
    params
  );

  const [unreadRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notification_logs
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       AND read_at IS NULL`,
    params
  );

  const [rows] = await pool.query(
    `SELECT *
     FROM notification_logs
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       ${unreadClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapNotificationLogRow),
    unreadCount: Number(unreadRows[0]?.total || 0),
    pagination: {
      page,
      limit,
      total: Number(countRows[0]?.total || 0),
      totalPages: Math.ceil(Number(countRows[0]?.total || 0) / limit) || 1,
    },
  };
}

export async function countUnreadInbox({ recipientType, recipientId }) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notification_logs
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       AND read_at IS NULL`,
    [recipientType, Number(recipientId)]
  );

  return Number(rows[0]?.total || 0);
}

export async function markInboxNotificationRead({ id, recipientType, recipientId }) {
  await pool.query(
    `UPDATE notification_logs
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ?
       AND recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'`,
    [id, recipientType, Number(recipientId)]
  );

  return findNotificationLogById(id);
}

export async function markAllInboxNotificationsRead({ recipientType, recipientId }) {
  const [result] = await pool.query(
    `UPDATE notification_logs
     SET read_at = CURRENT_TIMESTAMP
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       AND read_at IS NULL`,
    [recipientType, Number(recipientId)]
  );

  return { updated: result.affectedRows || 0 };
}

export async function clearInboxNotifications({ recipientType, recipientId }) {
  const [result] = await pool.query(
    `DELETE FROM notification_logs
     WHERE recipient_type = ?
       AND recipient_id = ?
       AND channel = 'in_app'`,
    [recipientType, Number(recipientId)]
  );

  return { deleted: result.affectedRows || 0 };
}

export async function getClientById(clientId) {
  const [rows] = await pool.query(
    'SELECT id, full_name, phone FROM clients WHERE id = ? AND deleted_at IS NULL',
    [clientId]
  );

  return rows[0]
    ? {
        id: rows[0].id,
        fullName: rows[0].full_name,
        phone: rows[0].phone,
      }
    : null;
}
