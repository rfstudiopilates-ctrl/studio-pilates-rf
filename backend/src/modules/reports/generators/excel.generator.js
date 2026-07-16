import ExcelJS from 'exceljs';
import {
  CLIENT_STATUS_LABELS,
  DAY_LABELS,
  RECOVERY_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  RESERVATION_STATUS_LABELS,
} from '../reports.constants.js';
import { formatCurrency, formatDate, formatDateTime } from './pdf.helpers.js';

async function createWorkbook(title, range) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Studio Pilates RF';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31));
  sheet.addRow([title]);
  sheet.addRow([`Período: ${range.from} → ${range.to}`]);
  sheet.addRow([`Generado: ${formatDateTime(new Date())}`]);
  sheet.addRow([]);

  return { workbook, sheet };
}

function styleHeaderRow(sheet, rowNumber, columnCount) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true };
  row.alignment = { vertical: 'middle' };

  for (let col = 1; col <= columnCount; col += 1) {
    sheet.getColumn(col).width = 20;
  }
}

async function buildSummarySheet(sheet, data) {
  sheet.addRow(['Clientes']);
  sheet.addRow(['Total', data.clients.totalClients]);
  sheet.addRow(['Activos', data.clients.activeClients]);
  sheet.addRow(['Con deuda', data.clients.clientsWithDebt]);
  sheet.addRow(['Suspendidos', data.clients.suspendedClients]);
  sheet.addRow([]);
  sheet.addRow(['Finanzas']);
  sheet.addRow(['Pagos', data.finances.totalPayments]);
  sheet.addRow(['Deuda pendiente', data.finances.totalDebts]);
  sheet.addRow(['Neto cobrado', data.finances.netCollected]);
  sheet.addRow([]);
  sheet.addRow(['Ocupación']);
  sheet.addRow(['Clases', data.occupancy.totalClasses]);
  sheet.addRow(['Ocupación %', data.occupancy.occupancyRate]);
  sheet.addRow([]);
  sheet.addRow(['Reservas']);
  sheet.addRow(['Total', data.reservations.total]);
  sheet.addRow(['Confirmadas', data.reservations.confirmed]);
  sheet.addRow(['Canceladas', data.reservations.cancelled]);
}

async function buildClientsSheet(sheet, data) {
  sheet.addRow(['Estado', 'Cantidad']);
  styleHeaderRow(sheet, sheet.lastRow.number, 2);
  data.stats.byStatus.forEach((item) => {
    sheet.addRow([CLIENT_STATUS_LABELS[item.status] || item.status, item.count]);
  });
  sheet.addRow([]);
  sheet.addRow(['Clientes con deuda pendiente']);
  sheet.addRow(['Cliente', 'Teléfono', 'Estado', 'Debe', 'Saldo']);
  styleHeaderRow(sheet, sheet.lastRow.number, 5);
  data.clientsWithDebt.forEach((client) => {
    sheet.addRow([
      client.fullName,
      client.phone || '-',
      CLIENT_STATUS_LABELS[client.status] || client.status,
      client.outstandingDebt ?? Math.abs(Math.min(client.balance, 0)),
      client.balance,
    ]);
  });
}

async function buildFinancesSheet(sheet, data) {
  sheet.addRow(['Concepto', 'Monto']);
  styleHeaderRow(sheet, sheet.lastRow.number, 2);
  sheet.addRow(['Pagos', data.stats.totalPayments]);
  sheet.addRow(['Deuda pendiente', data.stats.totalDebts]);
  sheet.addRow(['Créditos', data.stats.totalCredits]);
  sheet.addRow(['Débitos', data.stats.totalDebits]);
  sheet.addRow(['Neto cobrado', data.stats.netCollected]);
  sheet.addRow([]);
  sheet.addRow(['Detalle de pagos']);
  sheet.addRow(['Fecha', 'Cliente', 'Monto', 'Descripción']);
  styleHeaderRow(sheet, sheet.lastRow.number, 4);
  data.payments.forEach((payment) => {
    sheet.addRow([
      formatDateTime(payment.createdAt),
      payment.clientName,
      payment.amount,
      payment.description,
    ]);
  });
}

async function buildOccupancySheet(sheet, data) {
  sheet.addRow(['Fecha', 'Clases', 'Reservados', 'Capacidad', 'Ocupación %']);
  styleHeaderRow(sheet, sheet.lastRow.number, 5);
  data.stats.byDay.forEach((item) => {
    sheet.addRow([
      formatDate(item.date),
      item.classes,
      item.booked,
      item.capacity,
      item.occupancyRate,
    ]);
  });
}

async function buildReservationsSheet(sheet, data) {
  sheet.addRow(['Estado', 'Cantidad']);
  styleHeaderRow(sheet, sheet.lastRow.number, 2);
  data.stats.byStatus.forEach((item) => {
    sheet.addRow([RESERVATION_STATUS_LABELS[item.status] || item.status, item.count]);
  });
}

async function buildPlansSheet(sheet, data) {
  sheet.addRow(['Plan', 'Clientes activos']);
  styleHeaderRow(sheet, sheet.lastRow.number, 2);
  data.stats.distribution.forEach((item) => {
    sheet.addRow([item.planName, item.count]);
  });
}

async function buildSchedulesSheet(sheet, data) {
  sheet.addRow(['Día', 'Horario', 'Reservas']);
  styleHeaderRow(sheet, sheet.lastRow.number, 3);
  data.items.forEach((item) => {
    sheet.addRow([
      DAY_LABELS[item.dayOfWeek] || item.dayOfWeek,
      item.startTime,
      item.reservations,
    ]);
  });
}

async function buildRecoveriesSheet(sheet, data) {
  sheet.addRow(['Estado', 'Cantidad']);
  styleHeaderRow(sheet, sheet.lastRow.number, 2);
  data.stats.byStatus.forEach((item) => {
    sheet.addRow([RECOVERY_STATUS_LABELS[item.status] || item.status, item.count]);
  });
  sheet.addRow([]);
  sheet.addRow(['Cliente', 'Estado', 'Vence', 'Creada']);
  styleHeaderRow(sheet, sheet.lastRow.number, 4);
  data.stats.items.forEach((item) => {
    sheet.addRow([
      item.clientName,
      RECOVERY_STATUS_LABELS[item.status] || item.status,
      formatDate(item.expiresAt),
      formatDate(item.createdAt),
    ]);
  });
}

const EXCEL_BUILDERS = {
  [REPORT_TYPES.SUMMARY]: buildSummarySheet,
  [REPORT_TYPES.CLIENTS]: buildClientsSheet,
  [REPORT_TYPES.FINANCES]: buildFinancesSheet,
  [REPORT_TYPES.OCCUPANCY]: buildOccupancySheet,
  [REPORT_TYPES.RESERVATIONS]: buildReservationsSheet,
  [REPORT_TYPES.PLANS]: buildPlansSheet,
  [REPORT_TYPES.SCHEDULES]: buildSchedulesSheet,
  [REPORT_TYPES.RECOVERIES]: buildRecoveriesSheet,
};

export async function generateReportExcel(type, data) {
  const builder = EXCEL_BUILDERS[type];

  if (!builder) {
    throw new Error('Tipo de reporte no soportado para Excel');
  }

  const title = REPORT_TYPE_LABELS[type] || 'Reporte';
  const { workbook, sheet } = await createWorkbook(title, data.range);
  await builder(sheet, data);

  return workbook.xlsx.writeBuffer();
}

export { formatCurrency };
