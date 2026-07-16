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

export function buildWhatsAppUrl(phone, message) {
  const formattedPhone = formatWhatsAppNumber(phone);

  if (!formattedPhone || !message) {
    return null;
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
