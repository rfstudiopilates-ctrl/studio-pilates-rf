export const DEFAULT_WHATSAPP_MESSAGES = {
  reminder:
    'Hola {nombre}, te recordamos tu clase del {fecha} a las {hora} en {estudio}.',
  debtNotice:
    'Hola {nombre}, te recordamos que tenés una deuda pendiente de {monto} en {estudio}. Por favor regularizá el pago cuando puedas.',
  paymentReceipt:
    'Hola {nombre}, registramos tu pago de {monto} en {estudio}. Comprobante {comprobante} ({fecha}).',
  guestDropInOffer:
    'Hola {nombre}! Te confirmo que podemos darte el turno del {fecha} a las {hora} en {estudio}.\n\nPara reservarlo necesitamos la seña. ¿Cómo preferís pagar? Una vez acreditada te dejo el lugar confirmado.\n\n¡Gracias!',
  credentialsCreated:
    'Hola {nombre}! Te damos la bienvenida a {estudio}.\n\nTus datos de acceso:\nUsuario: {usuario}\nContraseña: {contraseña}\n\nPodés ingresar desde: {enlace}',
  credentialsResend:
    'Hola {nombre}! Te reenviamos tus datos de acceso a {estudio}.\n\nUsuario: {usuario}\nContraseña: {contraseña}\n\nPodés ingresar desde: {enlace}',
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  admin: {
    newReservation: true,
    pendingRequest: true,
    cancellation: true,
    scheduleChange: true,
  },
  client: {
    reservationApproved: true,
    reminder24h: true,
    cancellation: true,
    scheduleChangeApproved: true,
    expirationNotice: true,
    planCancelled: true,
  },
};

/**
 * Une defaults + datos guardados para notificaciones.
 * Si el JSON guardado no tiene alguna clave (p. ej. `pendingRequest`),
 * se toma el valor por defecto (true) en vez de tratarlo como false.
 */
export function normalizeNotificationSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const merged = {};
  for (const group of Object.keys(DEFAULT_NOTIFICATION_SETTINGS)) {
    const defaults = DEFAULT_NOTIFICATION_SETTINGS[group];
    const stored = source[group] && typeof source[group] === 'object' ? source[group] : {};

    merged[group] = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof stored[key] === 'boolean') {
        merged[group][key] = stored[key];
      }
    }
  }

  return merged;
}

/** Plantillas conectadas a flujos reales de WhatsApp (wa.me). */
export const WHATSAPP_MESSAGE_FIELDS = [
  {
    key: 'reminder',
    label: 'Recordatorio de clase',
    placeholders: '{nombre}, {fecha}, {hora}, {estudio}',
    usedIn: 'Clases y Dashboard · botón Recordatorio',
  },
  {
    key: 'debtNotice',
    label: 'Aviso de deuda',
    placeholders: '{nombre}, {monto}, {estudio}',
    usedIn: 'Cliente → Finanzas · botón Recordar deuda',
  },
  {
    key: 'paymentReceipt',
    label: 'Comprobante de pago',
    placeholders: '{nombre}, {monto}, {estudio}, {comprobante}, {fecha}',
    usedIn: 'Historial financiero · WhatsApp del comprobante',
  },
  {
    key: 'guestDropInOffer',
    label: 'Clase puntual (pedir seña)',
    placeholders: '{nombre}, {fecha}, {hora}, {estudio}',
    usedIn: 'Solicitudes / clase puntual · paso Contactar',
  },
  {
    key: 'credentialsCreated',
    label: 'Credenciales (alta)',
    placeholders: '{nombre}, {estudio}, {usuario}, {contraseña}, {enlace}',
    usedIn: 'Al crear un cliente',
  },
  {
    key: 'credentialsResend',
    label: 'Credenciales (reenvío)',
    placeholders: '{nombre}, {estudio}, {usuario}, {contraseña}, {enlace}',
    usedIn: 'Reenviar acceso al cliente',
  },
];

export const NOTIFICATION_FIELDS = {
  admin: [
    { key: 'newReservation', label: 'Nueva reserva' },
    { key: 'pendingRequest', label: 'Solicitud pendiente' },
    { key: 'cancellation', label: 'Cancelación' },
    { key: 'scheduleChange', label: 'Cambio de horario' },
  ],
  client: [
    { key: 'reservationApproved', label: 'Reserva aprobada' },
    { key: 'reminder24h', label: 'Recordatorio 24 h antes' },
    { key: 'cancellation', label: 'Cancelación' },
    { key: 'scheduleChangeApproved', label: 'Cambio de horario aprobado' },
    { key: 'expirationNotice', label: 'Aviso de vencimiento' },
    { key: 'planCancelled', label: 'Plan cancelado' },
  ],
};

/**
 * Une defaults + datos guardados y migra claves viejas.
 * - paymentRequest → paymentReceipt (solo si parece plantilla de comprobante)
 */
export function normalizeWhatsappMessages(raw) {
  const source = raw && typeof raw === 'object' ? { ...raw } : {};
  const normalized = { ...DEFAULT_WHATSAPP_MESSAGES };

  for (const key of Object.keys(DEFAULT_WHATSAPP_MESSAGES)) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      normalized[key] = source[key];
    }
  }

  if (
    (!source.paymentReceipt || !String(source.paymentReceipt).trim()) &&
    typeof source.paymentRequest === 'string' &&
    source.paymentRequest.trim()
  ) {
    const legacy = source.paymentRequest;
    if (legacy.includes('{comprobante}') || legacy.includes('{monto}')) {
      normalized.paymentReceipt = legacy;
    }
  }

  return normalized;
}
