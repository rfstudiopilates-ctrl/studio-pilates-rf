export function Button({
  children,
  className = '',
  variant = 'primary',
  isLoading = false,
  disabled = false,
  type = 'button',
  ...props
}) {
  const variants = {
    primary:
      'bg-text text-white hover:bg-black shadow-[0_8px_24px_rgba(26,26,26,0.18)]',
    secondary:
      'bg-white text-text border border-border hover:bg-surface-muted',
    ghost: 'bg-transparent text-text hover:bg-brand-50',
    danger:
      'bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {isLoading ? 'Procesando...' : children}
    </button>
  );
}
