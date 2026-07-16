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
  ],
};

export const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'operations', label: 'Operación' },
  { id: 'planes', label: 'Planes' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'fiscal', label: 'Datos fiscales' },
];
