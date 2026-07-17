export function Input({
  label,
  error,
  id,
  className = '',
  suffix,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          className={`h-11 w-full rounded-xl border bg-white px-4 text-base text-text outline-none transition-all duration-200 placeholder:text-text-muted focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:text-sm ${
            suffix ? 'pr-11' : ''
          } ${error ? 'border-danger' : 'border-border'}`}
          {...props}
        />
        {suffix ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{suffix}</div>
        ) : null}
      </div>
      {error ? <p className="text-xs leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
