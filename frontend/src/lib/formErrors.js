export class ApiError extends Error {
  constructor(message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.fields = fields;
  }
}

/** Extrae un mensaje usable desde ApiError, Axios o Error genérico. */
export function getErrorMessage(error, fallback = 'Ocurrió un error. Intentá de nuevo.') {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  const fromFields = error.fields?._form;
  if (typeof fromFields === 'string' && fromFields.trim()) {
    return fromFields;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    // Evitar el mensaje genérico de Axios sin body.
    if (
      error.message !== 'Network Error' &&
      !error.message.startsWith('Request failed with status')
    ) {
      return error.message;
    }
  }

  const apiMessage = error.response?.data?.error?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage;
  }

  if (error.message === 'Network Error') {
    return 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.';
  }

  return fallback;
}

export function getFormErrorsFromError(error) {
  const fields = error?.fields && typeof error.fields === 'object' ? { ...error.fields } : {};
  const hasFieldErrors = Object.keys(fields).length > 0;

  let formError = '';

  if (fields._form) {
    formError = fields._form;
    delete fields._form;
  } else if (!hasFieldErrors) {
    formError = getErrorMessage(error, '');
  }

  return { fields, formError };
}

export function mapBusinessErrorToFields(message) {
  if (!message) {
    return { fields: {}, formError: '' };
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('teléfono') || normalized.includes('telefono')) {
    return { fields: { phone: message }, formError: '' };
  }

  if (normalized.includes('usuario')) {
    return { fields: { username: message }, formError: '' };
  }

  if (normalized.includes('email')) {
    return { fields: { email: message }, formError: '' };
  }

  return { fields: {}, formError: message };
}
