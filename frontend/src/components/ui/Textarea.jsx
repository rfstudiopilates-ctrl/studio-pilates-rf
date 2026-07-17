export function Textarea({ label, error, id, className = '', rows = 4, ...props }) {
  const inputId = id || props.name;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-text outline-none transition-all duration-200 placeholder:text-text-muted focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:text-sm ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...props}
      />
      {error ? <p className="text-xs leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
