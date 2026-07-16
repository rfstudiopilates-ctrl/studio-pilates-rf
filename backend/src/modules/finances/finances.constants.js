export const MOVEMENT_TYPES = ['payment', 'debt', 'credit', 'debit'];

export const MOVEMENT_TYPE_LABELS = {
  payment: 'Pago',
  debt: 'Deuda',
  credit: 'Crédito',
  debit: 'Débito',
};

export const PAYMENT_METHODS = ['cash', 'transfer', 'credit_card', 'debit_card'];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
};

export const SETTLEMENT_ACTIONS = ['pay', 'account'];

export function calculateBalanceImpact(type, amount) {
  const value = Number(amount);

  switch (type) {
    case 'payment':
    case 'credit':
      return value;
    case 'debt':
    case 'debit':
      return -value;
    default:
      return 0;
  }
}
