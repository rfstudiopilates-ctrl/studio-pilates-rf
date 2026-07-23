import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import { formatTimeDisplay, getTodayInArgentina, toDateString } from '../../utils/dates.js';

function mapReservationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone || null,
    generatedClassId: row.generated_class_id,
    classDate: toDateString(row.class_date),
    startTime: formatTimeDisplay(row.start_time),
    endTime: formatTimeDisplay(row.end_time),
    clientPlanId: row.client_plan_id,
    recoveryCreditId: row.recovery_credit_id,
    recurringReservationId: row.recurring_reservation_id,
    status: row.status,
    bookingType: row.booking_type,
    consumesPlan: Boolean(row.consumes_plan),
    notes: row.notes,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecoveryCreditRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    clientId: row.client_id,
    sourceReservationId: row.source_reservation_id,
    expiresAt: row.expires_at,
    status: row.status,
    usedReservationId: row.used_reservation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecurringRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    scheduleTemplateId: row.schedule_template_id,
    clientPlanId: row.client_plan_id,
    dayOfWeek: row.day_of_week,
    startTime: formatTimeDisplay(row.start_time),
    status: row.status,
    startDate: toDateString(row.start_date),
    endDate: row.end_date ? toDateString(row.end_date) : null,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const reservationSelect = `
  SELECT r.*,
         c.full_name AS client_name,
         c.phone AS client_phone,
         gc.class_date,
         gc.start_time,
         gc.end_time
  FROM class_reservations r
  INNER JOIN clients c ON c.id = r.client_id
  INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
`;

export async function createReservation(data, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO class_reservations (
      client_id, generated_class_id, client_plan_id, recovery_credit_id,
      recurring_reservation_id, status, booking_type, consumes_plan,
      notes, created_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.clientId,
      data.generatedClassId,
      data.clientPlanId || null,
      data.recoveryCreditId || null,
      data.recurringReservationId || null,
      data.status,
      data.bookingType,
      data.consumesPlan ? 1 : 0,
      data.notes || null,
      data.createdByAdminId || null,
    ]
  );

  return findReservationById(result.insertId, connection);
}

export async function findReservationById(id, connection = pool) {
  const [rows] = await connection.query(`${reservationSelect} WHERE r.id = ?`, [id]);
  return mapReservationRow(rows[0]);
}

export async function findReservationByIdForUpdate(id, connection) {
  // Lock solo sobre la fila de reserva (evita rarezas de FOR UPDATE con JOIN).
  const [locked] = await connection.query(
    'SELECT id FROM class_reservations WHERE id = ? FOR UPDATE',
    [id]
  );

  if (!locked[0]) {
    return null;
  }

  return findReservationById(id, connection);
}

export async function listPendingDropInReservations(connection = pool) {
  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.status = 'pending'
       AND r.booking_type = 'drop_in'
     ORDER BY r.created_at ASC`
  );

  return rows.map(mapReservationRow);
}

export async function findReservationByClientAndClass(clientId, generatedClassId, connection = pool) {
  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.client_id = ? AND r.generated_class_id = ?
     LIMIT 1`,
    [clientId, generatedClassId]
  );

  return mapReservationRow(rows[0]);
}

export async function findActiveReservationByClientAndDate(
  clientId,
  classDate,
  connection = pool,
  { excludeReservationId } = {}
) {
  const params = [clientId, classDate];
  let excludeClause = '';

  if (excludeReservationId) {
    excludeClause = 'AND r.id <> ?';
    params.push(excludeReservationId);
  }

  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.client_id = ?
       AND gc.class_date = ?
       AND r.status IN ('pending', 'confirmed')
       ${excludeClause}
     ORDER BY gc.start_time ASC
     LIMIT 1`,
    params
  );

  return mapReservationRow(rows[0]);
}

export async function countConsumingReservationsInRange(
  clientId,
  clientPlanId,
  fromDate,
  toDate,
  connection = pool
) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     WHERE r.client_id = ?
       AND r.client_plan_id = ?
       AND r.consumes_plan = 1
       AND r.status IN ('pending', 'confirmed', 'completed', 'no_show')
       AND gc.class_date BETWEEN ? AND ?`,
    [clientId, clientPlanId, fromDate, toDate]
  );

  return Number(rows[0]?.total || 0);
}

export async function listConsumingReservationDatesInRange(
  clientId,
  clientPlanId,
  fromDate,
  toDate,
  connection = pool
) {
  const [rows] = await connection.query(
    `SELECT DISTINCT DATE_FORMAT(gc.class_date, '%Y-%m-%d') AS class_date
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     WHERE r.client_id = ?
       AND r.client_plan_id = ?
       AND r.consumes_plan = 1
       AND r.status IN ('pending', 'confirmed', 'completed', 'no_show')
       AND gc.class_date BETWEEN ? AND ?`,
    [clientId, clientPlanId, fromDate, toDate]
  );

  return rows.map((row) => row.class_date);
}

/** Fechas con cualquier reserva del cliente (incluye canceladas a tiempo). */
export async function listClientClassDatesInRange(
  clientId,
  fromDate,
  toDate,
  connection = pool
) {
  const [rows] = await connection.query(
    `SELECT DISTINCT DATE_FORMAT(gc.class_date, '%Y-%m-%d') AS class_date
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     WHERE r.client_id = ?
       AND r.status IN ('pending', 'confirmed', 'completed', 'no_show', 'cancelled')
       AND gc.class_date BETWEEN ? AND ?`,
    [clientId, fromDate, toDate]
  );

  return rows.map((row) => row.class_date);
}

export async function listActiveRecurringDaysByClient(clientId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT day_of_week
     FROM recurring_reservations
     WHERE client_id = ? AND status = 'active'`,
    [clientId]
  );

  return rows.map((row) => Number(row.day_of_week));
}

export async function countOccupyingRecurringByClientAndDay(clientId, dayOfWeek, connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM recurring_reservations
     WHERE client_id = ?
       AND day_of_week = ?
       AND status IN ('active', 'paused')`,
    [clientId, dayOfWeek]
  );

  return Number(rows[0]?.total || 0);
}

export async function listReservations({
  from,
  to,
  status,
  bookingType,
  clientId,
  classId,
  page = 1,
  limit = 50,
}) {
  const conditions = ['gc.class_date BETWEEN ? AND ?'];
  const params = [from, to];

  if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }

  if (bookingType) {
    conditions.push('r.booking_type = ?');
    params.push(bookingType);
  }

  if (clientId) {
    conditions.push('r.client_id = ?');
    params.push(clientId);
  }

  if (classId) {
    conditions.push('r.generated_class_id = ?');
    params.push(classId);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `${reservationSelect}
     WHERE ${whereClause}
     ORDER BY gc.class_date ASC, gc.start_time ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = countRows[0].total;

  return {
    items: rows.map(mapReservationRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function listClassReservations(classId) {
  const [rows] = await pool.query(
    `${reservationSelect}
     WHERE r.generated_class_id = ?
     ORDER BY r.created_at ASC`,
    [classId]
  );

  return rows.map(mapReservationRow);
}

export async function updateReservation(id, updates, connection = pool) {
  const fields = [];
  const params = [];
  const mapping = {
    status: 'status',
    generatedClassId: 'generated_class_id',
    clientPlanId: 'client_plan_id',
    recoveryCreditId: 'recovery_credit_id',
    recurringReservationId: 'recurring_reservation_id',
    bookingType: 'booking_type',
    consumesPlan: 'consumes_plan',
    cancelledAt: 'cancelled_at',
    cancelledBy: 'cancelled_by',
    cancellationReason: 'cancellation_reason',
    notes: 'notes',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(updates[key]);
    }
  });

  if (fields.length === 0) {
    return findReservationById(id, connection);
  }

  params.push(id);

  await connection.query(
    `UPDATE class_reservations SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return findReservationById(id, connection);
}

export async function createRecoveryCredit(data, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO recovery_credits (client_id, source_reservation_id, expires_at, status)
     VALUES (?, ?, ?, 'available')`,
    [data.clientId, data.sourceReservationId, data.expiresAt]
  );

  return findRecoveryCreditById(result.insertId, connection);
}

export async function findRecoveryCreditById(id, connection = pool) {
  const [rows] = await connection.query('SELECT * FROM recovery_credits WHERE id = ?', [id]);
  return mapRecoveryCreditRow(rows[0]);
}

export async function findRecoveryCreditByIdForUpdate(id, connection) {
  const [rows] = await connection.query(
    'SELECT * FROM recovery_credits WHERE id = ? FOR UPDATE',
    [id]
  );
  return mapRecoveryCreditRow(rows[0]);
}

export async function listRecoveryCredits(clientId, { status } = {}) {
  const conditions = ['client_id = ?'];
  const params = [clientId];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const [rows] = await pool.query(
    `SELECT * FROM recovery_credits
     WHERE ${conditions.join(' AND ')}
     ORDER BY expires_at ASC`,
    params
  );

  return rows.map(mapRecoveryCreditRow);
}

export async function markRecoveryCreditUsed(id, usedReservationId, connection = pool) {
  const [result] = await connection.query(
    `UPDATE recovery_credits
     SET status = 'used', used_reservation_id = ?
     WHERE id = ?
       AND status = 'available'`,
    [usedReservationId, id]
  );

  if (result.affectedRows === 0) {
    throw createAppError('El crédito de recuperación no está disponible', 400);
  }

  return findRecoveryCreditById(id, connection);
}

export async function expireRecoveryCredits() {
  const today = getTodayInArgentina();
  const [result] = await pool.query(
    `UPDATE recovery_credits
     SET status = 'expired'
     WHERE status = 'available' AND expires_at < ?`,
    [today]
  );

  return result.affectedRows;
}

export async function createRecurringReservation(data, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO recurring_reservations (
      client_id, schedule_template_id, client_plan_id,
      day_of_week, start_time, status, start_date, end_date, created_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      data.clientId,
      data.scheduleTemplateId,
      data.clientPlanId || null,
      data.dayOfWeek,
      data.startTime,
      data.startDate,
      data.endDate || null,
      data.createdByAdminId || null,
    ]
  );

  return findRecurringById(result.insertId, connection);
}

export async function findRecurringById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT rr.*, c.full_name AS client_name
     FROM recurring_reservations rr
     INNER JOIN clients c ON c.id = rr.client_id
     WHERE rr.id = ?`,
    [id]
  );

  return mapRecurringRow(rows[0]);
}

export async function listRecurringByClient(clientId) {
  const [rows] = await pool.query(
    `SELECT rr.*, c.full_name AS client_name
     FROM recurring_reservations rr
     INNER JOIN clients c ON c.id = rr.client_id
     WHERE rr.client_id = ?
     ORDER BY rr.day_of_week ASC, rr.start_time ASC`,
    [clientId]
  );

  return rows.map(mapRecurringRow);
}

export async function findRecurringByClientAndTemplate(clientId, scheduleTemplateId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT rr.*, c.full_name AS client_name
     FROM recurring_reservations rr
     INNER JOIN clients c ON c.id = rr.client_id
     WHERE rr.client_id = ? AND rr.schedule_template_id = ?
     LIMIT 1`,
    [clientId, scheduleTemplateId]
  );

  return mapRecurringRow(rows[0]);
}

export async function countOccupyingRecurringByClient(clientId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM recurring_reservations
     WHERE client_id = ? AND status IN ('active', 'paused')`,
    [clientId]
  );

  return Number(rows[0]?.total || 0);
}

export async function listActiveFutureReservationsByRecurring(recurringId, fromDate, connection = pool) {
  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.recurring_reservation_id = ?
       AND r.status IN ('pending', 'confirmed')
       AND gc.class_date >= ?
     ORDER BY gc.class_date ASC, gc.start_time ASC`,
    [recurringId, fromDate]
  );

  return rows.map(mapReservationRow);
}

/** Reservas pending/confirmed de un cliente (cualquier fecha). */
export async function listActiveReservationsByClient(clientId, connection = pool) {
  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.client_id = ?
       AND r.status IN ('pending', 'confirmed')
     ORDER BY gc.class_date ASC, gc.start_time ASC`,
    [clientId]
  );

  return rows.map(mapReservationRow);
}

/** Reservas activas con clase anterior a beforeDate. */
export async function listActivePastReservations({ beforeDate, clientId = null }, connection = pool) {
  const params = [beforeDate];
  let clientClause = '';

  if (clientId != null) {
    clientClause = 'AND r.client_id = ?';
    params.push(clientId);
  }

  const [rows] = await connection.query(
    `${reservationSelect}
     WHERE r.status IN ('pending', 'confirmed')
       AND gc.class_date < ?
       ${clientClause}
     ORDER BY gc.class_date ASC, gc.start_time ASC`,
    params
  );

  return rows.map(mapReservationRow);
}

/** Marca confirmadas vencidas como completed (no libera cupo: la clase ya ocurrió). */
export async function markPastConfirmedAsCompleted({ beforeDate, clientId = null }, connection = pool) {
  const params = [beforeDate];
  let clientClause = '';

  if (clientId != null) {
    clientClause = 'AND r.client_id = ?';
    params.push(clientId);
  }

  const [result] = await connection.query(
    `UPDATE class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     SET r.status = 'completed'
     WHERE r.status = 'confirmed'
       AND gc.class_date < ?
       ${clientClause}`,
    params
  );

  return Number(result.affectedRows || 0);
}

export async function listActiveRecurringReservations() {
  const [rows] = await pool.query(
    `SELECT rr.*, c.full_name AS client_name
     FROM recurring_reservations rr
     INNER JOIN clients c ON c.id = rr.client_id
     WHERE rr.status = 'active'
     ORDER BY rr.client_id ASC`
  );

  return rows.map(mapRecurringRow);
}

export async function getRecurringOccupancyByTemplate() {
  const [rows] = await pool.query(
    `SELECT
       rr.schedule_template_id AS scheduleTemplateId,
       COUNT(*) AS occupied,
       GROUP_CONCAT(c.full_name ORDER BY c.full_name SEPARATOR '||') AS client_names
     FROM recurring_reservations rr
     INNER JOIN clients c ON c.id = rr.client_id
     WHERE rr.status = 'active'
     GROUP BY rr.schedule_template_id`
  );

  const occupancy = {};

  for (const row of rows) {
    occupancy[row.scheduleTemplateId] = {
      occupied: Number(row.occupied || 0),
      clients: row.client_names ? String(row.client_names).split('||') : [],
    };
  }

  return occupancy;
}

export async function countOccupyingRecurringByTemplate(scheduleTemplateId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM recurring_reservations
     WHERE schedule_template_id = ?
       AND status = 'active'`,
    [scheduleTemplateId]
  );

  return Number(rows[0]?.total || 0);
}

export async function updateRecurringReservation(id, updates, connection = pool) {
  const fields = [];
  const params = [];
  const mapping = {
    status: 'status',
    endDate: 'end_date',
    clientPlanId: 'client_plan_id',
    startDate: 'start_date',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(updates[key]);
    }
  });

  if (fields.length === 0) {
    return findRecurringById(id, connection);
  }

  params.push(id);

  await connection.query(
    `UPDATE recurring_reservations SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return findRecurringById(id, connection);
}

export async function findFutureClassesForRecurring(recurring, fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status
     FROM generated_classes
     WHERE schedule_template_id = ?
       AND class_date BETWEEN ? AND ?
       AND status = 'scheduled'
     ORDER BY class_date ASC, start_time ASC`,
    [recurring.scheduleTemplateId, fromDate, toDate]
  );

  return rows.map((row) => ({
    id: row.id,
    scheduleTemplateId: row.schedule_template_id,
    classDate: toDateString(row.class_date),
    startTime: formatTimeDisplay(row.start_time),
    endTime: formatTimeDisplay(row.end_time),
    capacity: row.capacity,
    bookedCount: row.booked_count,
    spotsAvailable: Math.max(0, row.capacity - row.booked_count),
    status: row.status,
  }));
}
