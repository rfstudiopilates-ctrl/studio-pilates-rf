export function Select({ label, error, id, className = '', children, ...props }) {
  const selectId = id || props.name;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={`h-11 w-full rounded-xl border bg-white px-4 text-base text-text outline-none transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:text-sm ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
