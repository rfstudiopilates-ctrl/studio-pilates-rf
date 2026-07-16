/**
 * Utilidades de moneda Argentina (es-AR).
 * Miles: punto · Decimales: coma · Ej: 1.234,56
 */

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

/** Formatea un número a texto de input AR (sin símbolo $). */
export function formatCurrencyInputFromNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '';
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatIntegerWithDots(digits) {
  const cleaned = String(digits || '').replace(/\D/g, '');
  if (!cleaned) return '';

  const withoutLeading = cleaned.replace(/^0+(?=\d)/, '') || '0';
  return withoutLeading.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatea mientras se escribe: solo dígitos y coma decimal.
 * "1234,5" -> "1.234,5"
 */
export function formatCurrencyTyping(rawInput) {
  if (rawInput == null) return '';

  let raw = String(rawInput).replace(/[^\d,]/g, '');
  if (!raw) return '';

  const commaIndex = raw.indexOf(',');

  if (commaIndex === -1) {
    return formatIntegerWithDots(raw);
  }

  const integerDigits = raw.slice(0, commaIndex).replace(/\D/g, '');
  const decimalDigits = raw.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2);
  const formattedInt = formatIntegerWithDots(integerDigits || '0');

  if (raw.endsWith(',') && decimalDigits.length === 0) {
    return `${formattedInt},`;
  }

  return decimalDigits.length > 0 ? `${formattedInt},${decimalDigits}` : formattedInt;
}

/** Convierte texto ARS ("1.234,56") a number | null. */
export function parseCurrencyInput(formatted) {
  if (formatted == null) return null;

  const trimmed = String(formatted).trim();
  if (!trimmed || trimmed === ',') return null;

  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}
