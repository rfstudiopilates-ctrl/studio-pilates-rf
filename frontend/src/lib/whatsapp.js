import { isStandaloneDisplay } from './pwa';

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

function clickAnchor(href, { newTab = false } = {}) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.style.display = 'none';

  if (newTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Abre WhatsApp sin romper la PWA en iOS.
 * En standalone usa whatsapp:// (app nativa). window.open(wa.me) abre un
 * navegador interno que queda en blanco al volver.
 */
export function openWhatsApp({ phone, message }) {
  const formattedPhone = formatWhatsAppNumber(phone);

  if (!formattedPhone) {
    throw new Error('No hay un número de WhatsApp configurado');
  }

  const text = encodeURIComponent(message || '');
  const deepLink = `whatsapp://send?phone=${formattedPhone}&text=${text}`;
  const webLink = `https://wa.me/${formattedPhone}?text=${text}`;

  if (isStandaloneDisplay()) {
    clickAnchor(deepLink);
    return { mode: 'deeplink', url: deepLink };
  }

  clickAnchor(webLink, { newTab: true });
  return { mode: 'web', url: webLink };
}
