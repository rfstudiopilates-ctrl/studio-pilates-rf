export default function KpiCard({ label, value, hint, tone = 'default', onClick }) {
  const tones = {
    default: 'bg-white',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    danger: 'bg-red-50',
    brand: 'bg-brand-50',
  };

  const interactive = typeof onClick === 'function';
  const className = [
    'rounded-2xl border border-border p-4 text-left transition',
    tones[tone] || tones.default,
    interactive
      ? 'cursor-pointer hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(26,26,26,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
        {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
