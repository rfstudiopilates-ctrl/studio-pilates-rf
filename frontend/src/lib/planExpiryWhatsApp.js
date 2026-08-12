import { buildWhatsAppMessage, openWhatsApp } from './whatsapp';
import {
  formatDateDisplay,
  getDaysUntilDate,
  getTodayInArgentina,
  normalizeDateInput,
} from './dates';

const FALLBACK_PLAN_EXPIRY_TEMPLATE =
  'Hola {nombre}, te recordamos que tu plan {plan} en {estudio} vence {dias_texto} ({fecha}). ¡Renová a tiempo para no perder tu lugar!';

export function formatPlanExpiryDaysText(daysRemaining) {
  const days = Number(daysRemaining);

  if (!Number.isFinite(days)) {
    return 'pronto';
  }

  if (days < 0) {
    const overdue = Math.abs(days);
    return overdue === 1 ? 'hace 1 día' : `hace ${overdue} días`;
  }

  if (days === 0) {
    return 'hoy';
  }

  if (days === 1) {
    return 'mañana';
  }

  return `en ${days} días`;
}

export function getPlanExpiryInfo(endDate, today = getTodayInArgentina()) {
  const normalizedEnd = normalizeDateInput(endDate);
  if (!normalizedEnd || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedEnd)) {
    return null;
  }

  const daysRemaining = getDaysUntilDate(normalizedEnd, today);

  if (daysRemaining == null || !Number.isFinite(daysRemaining)) {
    return null;
  }

  return {
    endDate: normalizedEnd,
    daysRemaining,
    daysText: formatPlanExpiryDaysText(daysRemaining),
    isExpired: daysRemaining < 0,
    isToday: daysRemaining === 0,
    isUrgent: daysRemaining >= 0 && daysRemaining <= 3,
  };
}

export function buildPlanExpiryNoticeMessage({
  settings,
  clientName,
  planName,
  endDate,
  daysRemaining,
}) {
  const template =
    settings?.whatsappMessages?.planExpiryNotice?.trim() || FALLBACK_PLAN_EXPIRY_TEMPLATE;

  const days =
    daysRemaining != null ? Number(daysRemaining) : getDaysUntilDate(endDate);

  return buildWhatsAppMessage(template, {
    nombre: clientName || 'cliente',
    plan: planName || 'tu plan',
    estudio: settings?.studioName || 'el estudio',
    fecha: formatDateDisplay(endDate),
    dias: days != null && days >= 0 ? String(days) : '0',
    dias_texto: formatPlanExpiryDaysText(days),
  });
}

export function openPlanExpiryNoticeWhatsApp({
  settings,
  clientName,
  clientPhone,
  planName,
  endDate,
}) {
  if (!clientPhone) {
    throw new Error('Este cliente no tiene teléfono cargado.');
  }

  const info = getPlanExpiryInfo(endDate);
  if (!info) {
    throw new Error('Este cliente no tiene fecha de vencimiento de plan.');
  }

  if (info.isExpired) {
    throw new Error('El plan de este cliente ya venció. Renovalo o asigná uno nuevo.');
  }

  const message = buildPlanExpiryNoticeMessage({
    settings,
    clientName,
    planName,
    endDate: info.endDate,
    daysRemaining: info.daysRemaining,
  });

  openWhatsApp({ phone: clientPhone, message });
}
