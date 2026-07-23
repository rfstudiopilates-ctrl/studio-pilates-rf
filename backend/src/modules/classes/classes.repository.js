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

export async function updateClass(id, updates) {
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
    return getClassById(id);
  }

  params.push(id);

  await pool.query(
    `UPDATE generated_classes SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return getClassById(id);
}
