import { createAppError } from '../../utils/AppError.js';
import { buildWhatsAppMessage } from '../../utils/whatsapp.js';
import { getSettings } from '../settings/settings.repository.js';
import { EXPORT_FORMATS, REPORT_TYPE_LABELS } from './reports.constants.js';
import * as reportsRepository from './reports.repository.js';
import { generateReportExcel } from './generators/excel.generator.js';
import { generateReceiptPdf, generateReportPdf } from './generators/pdf.generator.js';
import { formatDate } from './generators/pdf.helpers.js';

export async function getReportPreview(query) {
  const data = await reportsRepository.buildReportData(query.type, query);

  if (!data) {
    throw createAppError('Tipo de reporte no válido', 400);
  }

  return {
    type: query.type,
    label: REPORT_TYPE_LABELS[query.type],
    range: data.range,
    data,
  };
}

export async function exportReport(query) {
  const data = await reportsRepository.buildReportData(query.type, query);

  if (!data) {
    throw createAppError('Tipo de reporte no válido', 400);
  }

  const settings = await getSettings();
  const filenameBase = `reporte-${query.type}-${data.range.from}-${data.range.to}`;

  if (query.format === EXPORT_FORMATS.PDF) {
    const buffer = await generateReportPdf(query.type, settings, data);
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `${filenameBase}.pdf`,
    };
  }

  const buffer = await generateReportExcel(query.type, data);
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${filenameBase}.xlsx`,
  };
}

export async function generatePaymentReceiptPdf(movementId, adminId) {
  const movement = await reportsRepository.getMovementForReceipt(movementId);

  if (!movement) {
    throw createAppError('Movimiento no encontrado', 404);
  }

  if (movement.type !== 'payment') {
    throw createAppError('Solo se pueden emitir comprobantes para pagos', 400);
  }

  const settings = await getSettings();
  const receipt = await reportsRepository.getOrCreateReceipt(movementId, adminId);
  const buffer = await generateReceiptPdf({ settings, movement, receipt });

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${receipt.receiptNumber}.pdf`,
    receipt,
    movement,
  };
}

export async function getPaymentReceiptWhatsApp(movementId, adminId) {
  const movement = await reportsRepository.getMovementForReceipt(movementId);

  if (!movement) {
    throw createAppError('Movimiento no encontrado', 404);
  }

  if (movement.type !== 'payment') {
    throw createAppError('Solo se pueden compartir comprobantes de pagos', 400);
  }

  const settings = await getSettings();
  const receipt = await reportsRepository.getOrCreateReceipt(movementId, adminId);

  const template =
    settings.whatsappMessages?.paymentReceipt ||
    settings.whatsappMessages?.paymentRequest ||
    'Hola {nombre}, registramos tu pago de {monto} en {estudio}. Comprobante {comprobante} ({fecha}).';

  const message = buildWhatsAppMessage(template, {
    nombre: movement.clientName,
    estudio: settings.studioName,
    monto: new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(movement.amount),
    comprobante: receipt.receiptNumber,
    fecha: formatDate(receipt.issuedAt),
  });

  return {
    phone: movement.clientPhone,
    message,
    receiptNumber: receipt.receiptNumber,
  };
}
