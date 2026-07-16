function getStudioInitials(studioName) {
  const words = String(studioName || '')
    .split(/\s+/)
    .filter(Boolean);

  // Prefer the trailing brand token when it's a short monogram (e.g. "RF" in "Studio Pilates RF").
  const last = words[words.length - 1] || '';
  if (last.length >= 2 && last.length <= 3 && /^[A-Za-zÀ-ÿ]+$/.test(last)) {
    return last.toUpperCase();
  }

  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'RF'
  );
}

export default function StudioLogo({ settings, className = '', size = 'md' }) {
  const studioName = settings?.studioName || 'Studio Pilates RF';
  const sizes = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-sm',
  };

  if (settings?.logoUrl) {
    return (
      <img
        src={settings.logoUrl}
        alt={studioName}
        className={`rounded-xl object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-brand-300 font-bold text-text ${sizes[size]} ${className}`}
    >
      {getStudioInitials(studioName)}
    </div>
  );
}
