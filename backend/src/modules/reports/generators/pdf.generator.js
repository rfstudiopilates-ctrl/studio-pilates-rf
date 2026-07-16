import {
  CLIENT_STATUS_LABELS,
  DAY_LABELS,
  RECOVERY_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  RESERVATION_STATUS_LABELS,
} from '../reports.constants.js';
import {
  createPdfBuffer,
  formatCurrency,
  formatDate,
  formatDateTime,
  writeKeyValueSection,
  writeReportHeader,
  writeTable,
} from './pdf.helpers.js';

function buildSummaryPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.SUMMARY], data.range);

  writeKeyValueSection(doc, 'Clientes', [
    ['Total', data.clients.totalClients],
    ['Activos', data.clients.activeClients],
    ['Con deuda', data.clients.clientsWithDebt],
    ['Suspendidos', data.clients.suspendedClients],
  ]);

  writeKeyValueSection(doc, 'Finanzas', [
    ['Pagos', formatCurrency(data.finances.totalPayments)],
    ['Deuda pendiente', formatCurrency(data.finances.totalDebts)],
    ['Neto cobrado', formatCurrency(data.finances.netCollected)],
    ['Movimientos', data.finances.totalMovements],
  ]);

  writeKeyValueSection(doc, 'Ocupación', [
    ['Clases', data.occupancy.totalClasses],
    ['Cupos reservados', `${data.occupancy.totalBooked}/${data.occupancy.totalCapacity}`],
    ['Tasa de ocupación', `${data.occupancy.occupancyRate}%`],
  ]);

  writeKeyValueSection(doc, 'Reservas', [
    ['Total', data.reservations.total],
    ['Confirmadas', data.reservations.confirmed],
    ['Canceladas', data.reservations.cancelled],
    ['Completadas', data.reservations.completed],
  ]);
}

function buildClientsPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.CLIENTS], data.range);

  writeKeyValueSection(
    doc,
    'Resumen',
    data.stats.byStatus.map((item) => [
      CLIENT_STATUS_LABELS[item.status] || item.status,
      item.count,
    ])
  );

  if (data.clientsWithDebt.length > 0) {
    writeTable(
      doc,
      ['Cliente', 'Teléfono', 'Estado', 'Debe'],
      data.clientsWithDebt.map((client) => [
        client.fullName,
        client.phone || '-',
        CLIENT_STATUS_LABELS[client.status] || client.status,
        formatCurrency(client.outstandingDebt ?? Math.abs(Math.min(client.balance, 0))),
      ])
    );
  }
}

function buildFinancesPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.FINANCES], data.range);

  writeKeyValueSection(doc, 'Resumen', [
    ['Pagos', formatCurrency(data.stats.totalPayments)],
    ['Deuda pendiente', formatCurrency(data.stats.totalDebts)],
    ['Créditos', formatCurrency(data.stats.totalCredits)],
    ['Débitos', formatCurrency(data.stats.totalDebits)],
    ['Neto cobrado', formatCurrency(data.stats.netCollected)],
  ]);

  if (data.payments.length > 0) {
    writeTable(
      doc,
      ['Fecha', 'Cliente', 'Monto', 'Descripción'],
      data.payments.map((payment) => [
        formatDateTime(payment.createdAt),
        payment.clientName,
        formatCurrency(payment.amount),
        payment.description,
      ])
    );
  }
}

function buildOccupancyPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.OCCUPANCY], data.range);

  writeKeyValueSection(doc, 'Resumen', [
    ['Clases', data.stats.totalClasses],
    ['Cupos', `${data.stats.totalBooked}/${data.stats.totalCapacity}`],
    ['Ocupación', `${data.stats.occupancyRate}%`],
  ]);

  if (data.stats.byDay.length > 0) {
    writeTable(
      doc,
      ['Fecha', 'Clases', 'Reservados', 'Capacidad', 'Ocupación'],
      data.stats.byDay.map((item) => [
        formatDate(item.date),
        item.classes,
        item.booked,
        item.capacity,
        `${item.occupancyRate}%`,
      ])
    );
  }
}

function buildReservationsPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.RESERVATIONS], data.range);

  writeTable(
    doc,
    ['Estado', 'Cantidad'],
    data.stats.byStatus.map((item) => [
      RESERVATION_STATUS_LABELS[item.status] || item.status,
      item.count,
    ])
  );
}

function buildPlansPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.PLANS], data.range);

  writeKeyValueSection(doc, 'Resumen', [['Planes activos', data.stats.activePlans]]);

  writeTable(
    doc,
    ['Plan', 'Clientes activos'],
    data.stats.distribution.map((item) => [item.planName, item.count])
  );
}

function buildSchedulesPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.SCHEDULES], data.range);

  writeTable(
    doc,
    ['Día', 'Horario', 'Reservas'],
    data.items.map((item) => [
      DAY_LABELS[item.dayOfWeek] || item.dayOfWeek,
      item.startTime,
      item.reservations,
    ])
  );
}

function buildRecoveriesPdf(doc, settings, data) {
  writeReportHeader(doc, settings, REPORT_TYPE_LABELS[REPORT_TYPES.RECOVERIES], data.range);

  writeKeyValueSection(doc, 'Resumen', [
    ['Total', data.stats.total],
    ['Disponibles', data.stats.available],
    ['Usadas', data.stats.used],
    ['Vencidas', data.stats.expired],
  ]);

  if (data.stats.items.length > 0) {
    writeTable(
      doc,
      ['Cliente', 'Estado', 'Vence', 'Creada'],
      data.stats.items.map((item) => [
        item.clientName,
        RECOVERY_STATUS_LABELS[item.status] || item.status,
        formatDate(item.expiresAt),
        formatDate(item.createdAt),
      ])
    );
  }
}

const PDF_BUILDERS = {
  [REPORT_TYPES.SUMMARY]: buildSummaryPdf,
  [REPORT_TYPES.CLIENTS]: buildClientsPdf,
  [REPORT_TYPES.FINANCES]: buildFinancesPdf,
  [REPORT_TYPES.OCCUPANCY]: buildOccupancyPdf,
  [REPORT_TYPES.RESERVATIONS]: buildReservationsPdf,
  [REPORT_TYPES.PLANS]: buildPlansPdf,
  [REPORT_TYPES.SCHEDULES]: buildSchedulesPdf,
  [REPORT_TYPES.RECOVERIES]: buildRecoveriesPdf,
};

export async function generateReportPdf(type, settings, data) {
  const builder = PDF_BUILDERS[type];

  if (!builder) {
    throw new Error('Tipo de reporte no soportado para PDF');
  }

  return createPdfBuffer((doc) => builder(doc, settings, data));
}

export async function generateReceiptPdf({ settings, movement, receipt }) {
  return createPdfBuffer((doc) => {
    doc.fontSize(18).text(settings.studioName || 'Studio Pilates RF', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text('Comprobante de pago', { align: 'center' });
    doc.moveDown();

    if (settings.fiscalName || settings.fiscalId || settings.fiscalAddress) {
      doc.fontSize(10).fillColor('#555555');
      if (settings.fiscalName) doc.text(settings.fiscalName, { align: 'center' });
      if (settings.fiscalId) doc.text(`CUIT: ${settings.fiscalId}`, { align: 'center' });
      if (settings.fiscalAddress) doc.text(settings.fiscalAddress, { align: 'center' });
      doc.moveDown();
      doc.fillColor('#000000');
    }

    writeKeyValueSection(doc, 'Datos del comprobante', [
      ['Número', receipt.receiptNumber],
      ['Fecha de emisión', formatDateTime(receipt.issuedAt)],
      ['Cliente', movement.clientName],
      ['Teléfono', movement.clientPhone || '-'],
      ['Monto', formatCurrency(movement.amount)],
      ['Concepto', movement.description],
      ['Saldo posterior', formatCurrency(movement.balanceAfter)],
    ]);

    doc.moveDown();
    doc
      .fontSize(9)
      .fillColor('#666666')
      .text(
        'Documento no válido como factura. Comprobante interno de pago emitido por el estudio.',
        { align: 'center' }
      );
  });
}
