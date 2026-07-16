import * as dashboardRepository from './dashboard.repository.js';
import { getTodayInArgentina } from '../../utils/dates.js';

export async function getDashboardOverview(query = {}) {
  const range = dashboardRepository.resolveDateRange(query);

  const [
    clients,
    plans,
    occupancy,
    reservations,
    finances,
    topClasses,
    pending,
    recentActivity,
  ] = await Promise.all([
    dashboardRepository.getClientStats(),
    dashboardRepository.getPlanStats(),
    dashboardRepository.getClassOccupancyStats(range.from, range.to),
    dashboardRepository.getReservationStats(range.from, range.to),
    dashboardRepository.getFinanceStats(range.from, range.to),
    dashboardRepository.getTopClasses(range.from, range.to),
    dashboardRepository.getPendingCounts(),
    dashboardRepository.getRecentActivity(),
  ]);

  return {
    range,
    summary: {
      totalClients: clients.totalClients,
      activeClients: clients.activeClients,
      clientsWithDebt: clients.clientsWithDebt,
      suspendedClients: clients.suspendedClients,
      activePlans: plans.activePlans,
      totalClasses: occupancy.totalClasses,
      totalCapacity: occupancy.totalCapacity,
      totalBooked: occupancy.totalBooked,
      occupancyRate: occupancy.occupancyRate,
      confirmedReservations: reservations.confirmed,
      pendingReservations: pending.pendingReservations,
      pendingScheduleChanges: pending.pendingScheduleChanges,
      totalPayments: finances.totalPayments,
      totalDebts: finances.totalDebts,
      netCollected: finances.netCollected,
    },
    clients,
    plans,
    occupancy,
    reservations,
    finances,
    topClasses,
    pending,
    recentActivity,
  };
}

export async function getTodayDashboard() {
  const today = getTodayInArgentina();
  const [todayClasses, pending] = await Promise.all([
    dashboardRepository.getTodayClasses(today),
    dashboardRepository.getPendingCounts(),
  ]);

  return {
    ...todayClasses,
    pending,
  };
}
