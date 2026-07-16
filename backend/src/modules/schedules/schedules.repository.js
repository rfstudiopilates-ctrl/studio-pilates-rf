import { pool } from '../../config/database.js';
import { normalizeTime } from '../../utils/dates.js';

function mapScheduleRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time?.slice?.(0, 5) || row.start_time,
    capacity: row.capacity,
    durationMinutes: row.duration_minutes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listScheduleTemplates() {
  const [rows] = await pool.query(
    `SELECT id, day_of_week, start_time, capacity, duration_minutes, is_active, created_at, updated_at
     FROM schedule_templates
     WHERE is_active = 1
     ORDER BY day_of_week ASC, start_time ASC`
  );

  return rows.map(mapScheduleRow);
}

export async function listActiveScheduleTemplates(connection = pool) {
  const [rows] = await connection.query(
    `SELECT id, day_of_week, start_time, capacity, duration_minutes, is_active
     FROM schedule_templates
     WHERE is_active = 1
     ORDER BY day_of_week ASC, start_time ASC`
  );

  return rows.map(mapScheduleRow);
}

export async function replaceScheduleTemplates(slots) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const keepIds = [];

    for (const slot of slots) {
      const startTime = normalizeTime(slot.startTime);
      const capacity = slot.capacity ?? 6;
      const durationMinutes = slot.durationMinutes ?? 60;

      const [existingRows] = await connection.query(
        `SELECT id
         FROM schedule_templates
         WHERE day_of_week = ? AND start_time = ?
         LIMIT 1`,
        [slot.dayOfWeek, startTime]
      );

      if (existingRows[0]) {
        await connection.query(
          `UPDATE schedule_templates
           SET capacity = ?, duration_minutes = ?, is_active = 1
           WHERE id = ?`,
          [capacity, durationMinutes, existingRows[0].id]
        );
        keepIds.push(existingRows[0].id);
      } else {
        const [insertResult] = await connection.query(
          `INSERT INTO schedule_templates (day_of_week, start_time, capacity, duration_minutes, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [slot.dayOfWeek, startTime, capacity, durationMinutes]
        );
        keepIds.push(insertResult.insertId);
      }
    }

    // Desactivar en lugar de borrar: evita huérfanos (ON DELETE SET NULL) y
    // no elimina horarios fijos de clientes por CASCADE.
    if (keepIds.length > 0) {
      await connection.query(
        `UPDATE schedule_templates
         SET is_active = 0
         WHERE id NOT IN (?)`,
        [keepIds]
      );
    } else {
      await connection.query(`UPDATE schedule_templates SET is_active = 0`);
    }

    await connection.commit();
    return listScheduleTemplates();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
