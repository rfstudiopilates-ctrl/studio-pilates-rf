import { pool } from '../../config/database.js';
import { formatTimeDisplay, toDateString } from '../../utils/dates.js';

function mapClassSummary(row, prefix) {
  if (!row) {
    return null;
  }

  return {
    id: row[`${prefix}_class_id`],
    classDate: toDateString(row[`${prefix}_class_date`]),
    startTime: formatTimeDisplay(row[`${prefix}_start_time`]),
    endTime: formatTimeDisplay(row[`${prefix}_end_time`]),
  };
}

function mapScheduleChangeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reservationId: row.reservation_id,
    clientId: row.client_id,
    clientName: row.client_name,
    fromGeneratedClassId: row.from_generated_class_id,
    toGeneratedClassId: row.to_generated_class_id,
    status: row.status,
    reason: row.reason,
    adminNotes: row.admin_notes,
    reviewedByAdminId: row.reviewed_by_admin_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fromClass: mapClassSummary(row, 'from'),
    toClass: mapClassSummary(row, 'to'),
    reservationStatus: row.reservation_status,
  };
}

const baseSelect = `
  SELECT scr.*,
         c.full_name AS client_name,
         r.status AS reservation_status,
         gc_from.id AS from_class_id,
         gc_from.class_date AS from_class_date,
         gc_from.start_time AS from_start_time,
         gc_from.end_time AS from_end_time,
         gc_to.id AS to_class_id,
         gc_to.class_date AS to_class_date,
         gc_to.start_time AS to_start_time,
         gc_to.end_time AS to_end_time
  FROM schedule_change_requests scr
  INNER JOIN clients c ON c.id = scr.client_id
  INNER JOIN class_reservations r ON r.id = scr.reservation_id
  INNER JOIN generated_classes gc_from ON gc_from.id = scr.from_generated_class_id
  INNER JOIN generated_classes gc_to ON gc_to.id = scr.to_generated_class_id
`;

export async function createScheduleChangeRequest(data, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO schedule_change_requests (
      reservation_id, client_id, from_generated_class_id, to_generated_class_id,
      status, reason
    ) VALUES (?, ?, ?, ?, 'pending', ?)`,
    [
      data.reservationId,
      data.clientId,
      data.fromGeneratedClassId,
      data.toGeneratedClassId,
      data.reason || null,
    ]
  );

  return findScheduleChangeById(result.insertId, connection);
}

export async function findScheduleChangeById(id, connection = pool) {
  const [rows] = await connection.query(`${baseSelect} WHERE scr.id = ?`, [id]);
  return mapScheduleChangeRow(rows[0]);
}

export async function findPendingByReservationId(reservationId, connection = pool) {
  const [rows] = await connection.query(
    `${baseSelect}
     WHERE scr.reservation_id = ? AND scr.status = 'pending'
     LIMIT 1`,
    [reservationId]
  );

  return mapScheduleChangeRow(rows[0]);
}

export async function listScheduleChanges({
  status,
  clientId,
  page = 1,
  limit = 50,
}) {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('scr.status = ?');
    params.push(status);
  }

  if (clientId) {
    conditions.push('scr.client_id = ?');
    params.push(clientId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM schedule_change_requests scr
     ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `${baseSelect}
     ${whereClause}
     ORDER BY scr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = countRows[0].total;

  return {
    items: rows.map(mapScheduleChangeRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function updateScheduleChange(id, updates, connection = pool) {
  const fields = [];
  const params = [];
  const mapping = {
    status: 'status',
    toGeneratedClassId: 'to_generated_class_id',
    adminNotes: 'admin_notes',
    reviewedByAdminId: 'reviewed_by_admin_id',
    reviewedAt: 'reviewed_at',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(updates[key]);
    }
  });

  if (fields.length === 0) {
    return findScheduleChangeById(id, connection);
  }

  params.push(id);

  await connection.query(
    `UPDATE schedule_change_requests SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return findScheduleChangeById(id, connection);
}

export async function countPendingScheduleChanges() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM schedule_change_requests WHERE status = 'pending'"
  );

  return rows[0].total;
}
