import { formatCurrency } from './currency';
import { buildWhatsAppMessage, openWhatsApp } from './whatsapp';

const FALLBACK_DEBT_TEMPLATE =
  'Hola {nombre}, te recordamos que tenés una deuda pendiente de {monto} en {estudio}. Por favor regularizá el pago cuando puedas.';

export function buildDebtNoticeMessage({ settings, clientName, debtAmount }) {
  let template =
    settings?.whatsappMessages?.debtNotice?.trim() || FALLBACK_DEBT_TEMPLATE;

  // Plantillas viejas sin {monto}: agregamos el importe igual.
  if (!template.includes('{monto}')) {
    template = `${template.replace(/\s+$/, '')} Deuda pendiente: {monto}.`;
  }

  return buildWhatsAppMessage(template, {
    nombre: clientName || 'cliente',
    monto: formatCurrency(debtAmount),
    estudio: settings?.studioName || 'el estudio',
  });
}

export function openDebtNoticeWhatsApp({
  settings,
  clientName,
  clientPhone,
  debtAmount,
}) {
  if (!clientPhone) {
    throw new Error('Este cliente no tiene teléfono cargado.');
  }

  const amount = Number(debtAmount || 0);
  if (!(amount > 0)) {
    throw new Error('El cliente no tiene deuda pendiente.');
  }

  const message = buildDebtNoticeMessage({
    settings,
    clientName,
    debtAmount: amount,
  });

  openWhatsApp({ phone: clientPhone, message });
}
