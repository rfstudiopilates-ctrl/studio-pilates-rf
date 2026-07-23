import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import { formatTimeDisplay, toDateString } from '../../utils/dates.js';

function mapClassRow(row) {
  if (!row) {
    return null;
  }

  const spotsAvailable = Math.max(0, row.capacity - row.booked_count);

  return {
    id: row.id,
    scheduleTemplateId: row.schedule_template_id,
    classDate: toDateString(row.class_date),
    startTime: formatTimeDisplay(row.start_time),
    endTime: formatTimeDisplay(row.end_time),
    capacity: row.capacity,
    bookedCount: row.booked_count,
    spotsAvailable,
    isFull: spotsAvailable === 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertClassIfNotExists(classData, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO generated_classes (
      schedule_template_id, class_date, start_time, end_time, capacity
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      schedule_template_id = IF(status = 'scheduled', VALUES(schedule_template_id), schedule_template_id),
      end_time = IF(status = 'scheduled', VALUES(end_time), end_time),
      capacity = IF(
        status = 'scheduled' AND VALUES(capacity) >= booked_count,
        VALUES(capacity),
        capacity
      )`,
    [
      classData.scheduleTemplateId,
      classData.classDate,
      classData.startTime,
      classData.endTime,
      classData.capacity,
    ]
  );

  // MySQL: 1 = insert, 2 = update row changed, 0 = update with same values.
  return result.affectedRows === 1;
}

export async function listClasses({ from, to, status, page = 1, limit = 50 }) {
  const conditions = ['class_date BETWEEN ? AND ?'];
  const params = [from, to];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM generated_classes WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status, created_at, updated_at
     FROM generated_classes
     WHERE ${whereClause}
     ORDER BY class_date ASC, start_time ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = countRows[0].total;

  return {
    items: rows.map(mapClassRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function listClassesInRange({ from, to, status }) {
  const conditions = ['class_date BETWEEN ? AND ?'];
  const params = [from, to];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const [rows] = await pool.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status, created_at, updated_at
     FROM generated_classes
     WHERE ${conditions.join(' AND ')}
     ORDER BY class_date ASC, start_time ASC`,
    params
  );

  return rows.map(mapClassRow);
}

export async function getClassById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status, created_at, updated_at
     FROM generated_classes
     WHERE id = ?`,
    [id]
  );

  return mapClassRow(rows[0]);
}

export async function getClassByIdForUpdate(id, connection) {
  const [rows] = await connection.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status, created_at, updated_at
     FROM generated_classes
     WHERE id = ?
     FOR UPDATE`,
    [id]
  );

  return mapClassRow(rows[0]);
}

export async function adjustBookedCount(id, delta, connection) {
  const deltaNumber = Number(delta);

  if (!Number.isFinite(deltaNumber) || deltaNumber === 0) {
    return;
  }

  if (deltaNumber > 0) {
    const [result] = await connection.query(
      `UPDATE generated_classes
       SET booked_count = booked_count + ?
       WHERE id = ?
         AND booked_count + ? <= capacity`,
      [deltaNumber, id, deltaNumber]
    );

    if (result.affectedRows === 0) {
      throw createAppError('La clase no tiene cupos disponibles', 400);
    }

    return;
  }

  const absDelta = Math.abs(deltaNumber);
  const [result] = await connection.query(
    `UPDATE generated_classes
     SET booked_count = booked_count - ?
     WHERE id = ?
       AND booked_count >= ?`,
    [absDelta, id, absDelta]
  );

  // Si ya estaba en 0 (carrera), no forzar negativo: dejamos el valor actual.
  void result;
}

/**
 * Recalcula booked_count desde reservas activas (pending/confirmed).
 * Evita que canceladas/no_show sigan ocupando cupo por desfase.
 */
export async function syncBookedCountFromReservations(id, connection = pool) {
  await connection.query(
    `UPDATE generated_classes gc
     SET booked_count = (
       SELECT COUNT(*)
       FROM class_reservations r
       WHERE r.generated_class_id = gc.id
         AND r.status IN ('pending', 'confirmed')
     )
     WHERE gc.id = ?`,
    [id]
  );

  return getClassById(id, connection);
}

export async function updateClass(id, updates, connection = pool) {
  const fields = [];
  const params = [];

  if (updates.capacity !== undefined) {
    fields.push('capacity = ?');
    params.push(updates.capacity);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    params.push(updates.status);
  }

  if (fields.length === 0) {
    return getClassById(id, connection);
  }

  params.push(id);

  await connection.query(
    `UPDATE generated_classes SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return getClassById(id, connection);
}

/**
 * Clases programadas futuras (o de hoy aún no iniciadas) para un día + hora.
 * dayOfWeek: 1=Lunes … 7=Domingo (coincide con schedule_templates).
 */
export async function listFutureScheduledByDayTime({
  dayOfWeek,
  startTime,
  fromDate,
  fromTime,
}) {
  const time = String(startTime).slice(0, 5);
  const [rows] = await pool.query(
    `SELECT id, schedule_template_id, class_date, start_time, end_time,
            capacity, booked_count, status, created_at, updated_at
     FROM generated_classes
     WHERE status = 'scheduled'
       AND (WEEKDAY(class_date) + 1) = ?
       AND TIME_FORMAT(start_time, '%H:%i') = ?
       AND (
         class_date > ?
         OR (class_date = ? AND TIME_FORMAT(start_time, '%H:%i') >= ?)
       )
     ORDER BY class_date ASC, start_time ASC`,
    [dayOfWeek, time, fromDate, fromDate, fromTime || '00:00']
  );

  return rows.map(mapClassRow);
}

/**
 * Horarios (día+hora) con clases futuras programadas sin plantilla activa.
 * Útil cuando se quitó el slot de Horarios pero las clases siguen en el calendario.
 */
export async function listOrphanFutureScheduleGroups({ fromDate, fromTime }) {
  const [rows] = await pool.query(
    `SELECT
       (WEEKDAY(gc.class_date) + 1) AS day_of_week,
       TIME_FORMAT(gc.start_time, '%H:%i') AS start_time,
       COUNT(*) AS class_count,
       COALESCE(SUM(
         (SELECT COUNT(*)
          FROM class_reservations r
          WHERE r.generated_class_id = gc.id
            AND r.status IN ('pending', 'confirmed'))
       ), 0) AS active_reservations,
       MIN(gc.class_date) AS first_class_date,
       MAX(gc.class_date) AS last_class_date
     FROM generated_classes gc
     WHERE gc.status = 'scheduled'
       AND (
         gc.class_date > ?
         OR (gc.class_date = ? AND TIME_FORMAT(gc.start_time, '%H:%i') >= ?)
       )
       AND NOT EXISTS (
         SELECT 1
         FROM schedule_templates st
         WHERE st.is_active = 1
           AND st.day_of_week = (WEEKDAY(gc.class_date) + 1)
           AND TIME_FORMAT(st.start_time, '%H:%i') = TIME_FORMAT(gc.start_time, '%H:%i')
       )
     GROUP BY day_of_week, start_time
     ORDER BY day_of_week ASC, start_time ASC`,
    [fromDate, fromDate, fromTime || '00:00']
  );

  return rows.map((row) => ({
    dayOfWeek: Number(row.day_of_week),
    startTime: row.start_time,
    classCount: Number(row.class_count || 0),
    activeReservations: Number(row.active_reservations || 0),
    firstClassDate: toDateString(row.first_class_date),
    lastClassDate: toDateString(row.last_class_date),
  }));
}
