export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function mixHex(baseHex, targetHex, weight) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);

  return rgbToHex(
    base.r + (target.r - base.r) * weight,
    base.g + (target.g - base.g) * weight,
    base.b + (target.b - base.b) * weight
  );
}

export function applyStudioTheme(settings) {
  if (!settings) {
    return;
  }

  const root = document.documentElement;
  const primary = settings.primaryColor || '#F4C2C2';
  const secondary = settings.secondaryColor || '#1A1A1A';
  const accent = settings.accentColor || '#FFFFFF';
  const background = settings.backgroundColor || '#F8F8F8';

  root.style.setProperty('--color-brand-50', mixHex(primary, '#FFFFFF', 0.92));
  root.style.setProperty('--color-brand-100', mixHex(primary, '#FFFFFF', 0.84));
  root.style.setProperty('--color-brand-200', mixHex(primary, '#FFFFFF', 0.68));
  root.style.setProperty('--color-brand-300', primary);
  root.style.setProperty('--color-brand-400', mixHex(primary, '#000000', 0.12));
  root.style.setProperty('--color-brand-500', mixHex(primary, '#000000', 0.24));
  root.style.setProperty('--color-brand-600', mixHex(primary, '#000000', 0.36));
  root.style.setProperty('--color-text', secondary);
  root.style.setProperty('--color-surface', accent);
  root.style.setProperty('--color-surface-muted', background);
  root.style.setProperty('--color-border', mixHex(background, '#000000', 0.08));

  if (settings.studioName) {
    document.title = settings.studioName;
  }
}
