export function formatWhatsAppNumber(number) {
  if (!number) {
    return '';
  }

  return number.replace(/\D/g, '');
}

export function buildWhatsAppMessage(template, variables = {}) {
  return Object.entries(variables).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, value ?? '');
  }, template);
}

export function openWhatsApp({ phone, message }) {
  const formattedPhone = formatWhatsAppNumber(phone);

  if (!formattedPhone) {
    throw new Error('No hay un número de WhatsApp configurado');
  }

  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
