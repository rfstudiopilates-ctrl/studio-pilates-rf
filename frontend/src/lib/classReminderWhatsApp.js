import { formatDateDisplay } from './dates';
import { buildWhatsAppMessage, openWhatsApp } from './whatsapp';

const FALLBACK_REMINDER_TEMPLATE =
  'Hola {nombre}, te recordamos tu clase del {fecha} a las {hora} en {estudio}.';

export function buildClassReminderMessage({
  settings,
  clientName,
  classDate,
  startTime,
}) {
  const template =
    settings?.whatsappMessages?.reminder?.trim() || FALLBACK_REMINDER_TEMPLATE;

  return buildWhatsAppMessage(template, {
    nombre: clientName || 'cliente',
    fecha: formatDateDisplay(classDate),
    hora: startTime || '',
    estudio: settings?.studioName || 'el estudio',
  });
}

export function openClassReminderWhatsApp({
  settings,
  clientName,
  clientPhone,
  classDate,
  startTime,
}) {
  if (!clientPhone) {
    throw new Error('Este alumno no tiene teléfono cargado.');
  }

  const message = buildClassReminderMessage({
    settings,
    clientName,
    classDate,
    startTime,
  });

  openWhatsApp({ phone: clientPhone, message });
}
