export function Alert({ children, variant = 'info', className = '' }) {
  const variants = {
    info: 'border-brand-200 bg-brand-50 text-text',
    success: 'border-emerald-200 bg-emerald-50 text-success',
    error: 'border-red-200 bg-red-50 text-danger',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
