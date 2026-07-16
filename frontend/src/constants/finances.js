import { getMonthStartDate, getTodayInArgentina, getWeekStartDate } from '../lib/dates';

export const PAYMENT_METHODS = ['cash', 'transfer', 'credit_card', 'debit_card'];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
};

export const PAYMENT_METHOD_ICONS = {
  cash: '💵',
  transfer: '🏦',
  credit_card: '💳',
  debit_card: '💳',
};

export const SETTLEMENT_ACTIONS = {
  pay: 'pay',
  account: 'account',
};

export const SETTLEMENT_ACTION_LABELS = {
  pay: 'Pagar ahora',
  account: 'Cuenta corriente',
};

export const FINANCE_PERIOD_PRESETS = [
  { value: 'month', label: 'Este mes' },
  { value: 'week', label: 'Esta semana' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo el período' },
];

function addDaysYmd(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getFinanceDateRange(preset) {
  const today = getTodayInArgentina();

  if (preset === 'week') {
    return { from: getWeekStartDate(today), to: today };
  }

  if (preset === '30d') {
    return { from: addDaysYmd(today, -29), to: today };
  }

  if (preset === 'month') {
    return { from: getMonthStartDate(today), to: today };
  }

  return { from: undefined, to: undefined };
}
