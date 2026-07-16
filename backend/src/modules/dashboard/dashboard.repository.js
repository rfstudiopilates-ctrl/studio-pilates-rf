import { pool } from '../../config/database.js';
import {
  addDaysToDate,
  formatTimeDisplay,
  getMonthEndDate,
  getMonthStartDate,
  getTodayInArgentina,
  getWeekStartDate,
  sqlDateInArgentina,
  toDateString,
} from '../../utils/dates.js';

export function resolveDateRange({ period, from, to } = {}) {
  const today = getTodayInArgentina();

  if (from && to) {
    return { from, to, period: 'custom' };
  }

  if (period === 'week') {
    return {
      from: getWeekStartDate(today),
      to: addDaysToDate(getWeekStartDate(today), 6),
      period: 'week',
    };
  }

  if (period === '30d') {
    return {
      from: addDaysToDate(today, -29),
      to: today,
      period: '30d',
    };
  }

  return {
    from: getMonthStartDate(today),
    to: getMonthEndDate(today),
    period: period || 'month',
  };
}

export async function getClientStats() {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS total
     FROM clients
     WHERE deleted_at IS NULL
     GROUP BY status`
  );

  const [outstandingRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest
     INNER JOIN clients c ON c.id = latest.client_id AND c.deleted_at IS NULL
     WHERE latest.balance_after < 0`
  );

  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = Number(row.total);
    return acc;
  }, {});

  const totalClients = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

  return {
    totalClients,
    activeClients: byStatus.active || 0,
    clientsWithDebt: Number(outstandingRows[0]?.total || 0),
    suspendedClients: byStatus.suspended || 0,
    byStatus: rows.map((row) => ({
      status: row.status,
      count: Number(row.total),
    })),
  };
}

export async function getPlanStats() {
  const [activePlansRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM client_plans WHERE status = 'active'"
  );

  const [distributionRows] = await pool.query(
    `SELECT p.name AS plan_name, COUNT(cp.id) AS total
     FROM client_plans cp
     INNER JOIN plans p ON p.id = cp.plan_id
     WHERE cp.status = 'active'
     GROUP BY p.id, p.name
     ORDER BY total DESC`
  );

  return {
    activePlans: Number(activePlansRows[0].total),
    distribution: distributionRows.map((row) => ({
      planName: row.plan_name,
      count: Number(row.total),
    })),
  };
}

export async function getClassOccupancyStats(from, to) {
  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(*) AS total_classes,
       COALESCE(SUM(capacity), 0) AS total_capacity,
       COALESCE(SUM(booked_count), 0) AS total_booked
     FROM generated_classes
     WHERE class_date BETWEEN ? AND ?
       AND status = 'scheduled'`,
    [from, to]
  );

  const [dailyRows] = await pool.query(
    `SELECT
       class_date AS date,
       COUNT(*) AS classes,
       COALESCE(SUM(capacity), 0) AS capacity,
       COALESCE(SUM(booked_count), 0) AS booked
     FROM generated_classes
     WHERE class_date BETWEEN ? AND ?
       AND status = 'scheduled'
     GROUP BY class_date
     ORDER BY class_date ASC`,
    [from, to]
  );

  const summary = summaryRows[0];
  const totalCapacity = Number(summary.total_capacity);
  const totalBooked = Number(summary.total_booked);

  return {
    totalClasses: Number(summary.total_classes),
    totalCapacity,
    totalBooked,
    occupancyRate: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
    byDay: dailyRows.map((row) => {
      const capacity = Number(row.capacity);
      const booked = Number(row.booked);
      return {
        date: toDateString(row.date),
        classes: Number(row.classes),
        capacity,
        booked,
        occupancyRate: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
      };
    }),
  };
}

export async function getReservationStats(from, to) {
  const [rows] = await pool.query(
    `SELECT r.status, COUNT(*) AS total
     FROM class_reservations r
     INNER JOIN generated_classes gc ON gc.id = r.generated_class_id
     WHERE gc.class_date BETWEEN ? AND ?
     GROUP BY r.status`,
    [from, to]
  );

  const byStatus = rows.reduce((acc, row) => {
    acc[row.status] = Number(row.total);
    return acc;
  }, {});

  const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

  return {
    total,
    confirmed: byStatus.confirmed || 0,
    pending: byStatus.pending || 0,
    cancelled: byStatus.cancelled || 0,
    completed: byStatus.completed || 0,
    byStatus: rows.map((row) => ({
      status: row.status,
      count: Number(row.total),
    })),
  };
}

export async function getFinanceStats(from, to) {
  const [summaryRows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS total_payments,
       COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END), 0) AS total_debts_generated,
       COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_credits,
       COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS total_debits,
       COUNT(*) AS total_movements
     FROM financial_movements
     WHERE ${sqlDateInArgentina('created_at')} BETWEEN ? AND ?`,
    [from, to]
  );

  const [dailyRows] = await pool.query(
    `SELECT
       ${sqlDateInArgentina('created_at')} AS date,
       COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS payments,
       COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END), 0) AS debts
     FROM financial_movements
     WHERE ${sqlDateInArgentina('created_at')} BETWEEN ? AND ?
     GROUP BY ${sqlDateInArgentina('created_at')}
     ORDER BY date ASC`,
    [from, to]
  );

  const [outstandingRows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN latest.balance_after < 0 THEN -latest.balance_after ELSE 0 END), 0)
         AS outstanding_debt_total
     FROM (
       SELECT fm.client_id, fm.balance_after
       FROM financial_movements fm
       INNER JOIN (
         SELECT client_id, MAX(id) AS max_id
         FROM financial_movements
         GROUP BY client_id
       ) ids ON ids.max_id = fm.id
     ) latest
     INNER JOIN clients c ON c.id = latest.client_id AND c.deleted_at IS NULL`
  );

  const summary = summaryRows[0];
  const totalPayments = Number(summary.total_payments);
  const totalDebts = Number(outstandingRows[0]?.outstanding_debt_total || 0);

  return {
    totalPayments,
    totalDebts,
    totalDebtsGenerated: Number(summary.total_debts_generated),
    totalCredits: Number(summary.total_credits),
    totalDebits: Number(summary.total_debits),
    totalMovements: Number(summary.total_movements),
    netCollected: totalPayments - Number(summary.total_debits),
    byDay: dailyRows.map((row) => ({
      date: row.date,
      payments: Number(row.payments),
      debts: Number(row.debts),
    })),
  };
}

export async function getTopClasses(from, to, limit = 5) {
  const [rows] = await pool.query(
    `SELECT id, class_date, start_time, capacity, booked_count
     FROM generated_classes
     WHERE class_date BETWEEN ? AND ?
       AND status = 'scheduled'
     ORDER BY (booked_count / GREATEST(capacity, 1)) DESC, booked_count DESC
     LIMIT ?`,
    [from, to, limit]
  );

  return rows.map((row) => {
    const capacity = Number(row.capacity);
    const booked = Number(row.booked_count);
    return {
      id: row.id,
      classDate: toDateString(row.class_date),
      startTime: row.start_time?.slice?.(0, 5) || row.start_time,
      capacity,
      bookedCount: booked,
      occupancyRate: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
    };
  });
}

export async function getPendingCounts() {
  const [scheduleChangesRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM schedule_change_requests WHERE status = 'pending'"
  );

  const [pendingReservationsRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM class_reservations WHERE status = 'pending'"
  );

  return {
    pendingScheduleChanges: Number(scheduleChangesRows[0].total),
    pendingReservations: Number(pendingReservationsRows[0].total),
  };
}

export async function getRecentActivity(limit = 8) {
  const [rows] = await pool.query(
    `SELECT ch.id, ch.action_type, ch.description, ch.created_at, c.full_name AS client_name
     FROM client_history ch
     INNER JOIN clients c ON c.id = ch.client_id AND c.deleted_at IS NULL
     ORDER BY ch.created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    actionType: row.action_type,
    description: row.description,
    clientName: row.client_name,
    createdAt: row.created_at,
  }));
}

export async function getTodayClasses(date = getTodayInArgentina()) {
  const [classRows] = await pool.query(
    `SELECT id, class_date, start_time, end_time, capacity, booked_count, status
     FROM generated_classes
     WHERE class_date = ?
       AND status = 'scheduled'
     ORDER BY start_time ASC`,
    [date]
  );

  if (classRows.length === 0) {
    return {
      date,
      classes: [],
      summary: {
        totalClasses: 0,
        totalBooked: 0,
        totalCapacity: 0,
        occupancyRate: 0,
        upcomingCount: 0,
      },
    };
  }

  const classIds = classRows.map((row) => row.id);
  const placeholders = classIds.map(() => '?').join(', ');

  const [reservationRows] = await pool.query(
    `SELECT
       r.id,
       r.generated_class_id,
       r.status,
       r.booking_type,
       c.id AS client_id,
       c.full_name AS client_name,
       c.phone AS client_phone
     FROM class_reservations r
     INNER JOIN clients c ON c.id = r.client_id AND c.deleted_at IS NULL
     WHERE r.generated_class_id IN (${placeholders})
       AND r.status IN ('pending', 'confirmed')
     ORDER BY c.full_name ASC`,
    classIds
  );

  const reservationsByClass = new Map();

  for (const row of reservationRows) {
    const classId = row.generated_class_id;
    if (!reservationsByClass.has(classId)) {
      reservationsByClass.set(classId, []);
    }

    reservationsByClass.get(classId).push({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      status: row.status,
      bookingType: row.booking_type,
    });
  }

  const classes = classRows.map((row) => {
    const capacity = Number(row.capacity);
    const bookedCount = Number(row.booked_count);
    const students = reservationsByClass.get(row.id) || [];
    const spotsAvailable = Math.max(0, capacity - bookedCount);

    return {
      id: row.id,
      classDate: toDateString(row.class_date),
      startTime: formatTimeDisplay(row.start_time),
      endTime: formatTimeDisplay(row.end_time),
      capacity,
      bookedCount,
      spotsAvailable,
      isFull: spotsAvailable === 0,
      occupancyRate: capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0,
      status: row.status,
      students,
    };
  });

  const totalBooked = classes.reduce((sum, item) => sum + item.bookedCount, 0);
  const totalCapacity = classes.reduce((sum, item) => sum + item.capacity, 0);

  return {
    date,
    classes,
    summary: {
      totalClasses: classes.length,
      totalBooked,
      totalCapacity,
      occupancyRate: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
    },
  };
}
