import { formatDateDisplay } from '../../lib/dates';

function formatLabel(item) {
  if (item.label) return item.label;
  if (item.date) {
    try {
      return formatDateDisplay(item.date);
    } catch {
      return String(item.date);
    }
  }
  return item.key || '';
}

export default function SimpleBarChart({
  title,
  items = [],
  valueKey = 'value',
  labelKey,
  formatValue = (value) => value,
  emptyMessage = 'Sin datos para el período seleccionado.',
}) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-text">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const value = Number(item[valueKey]) || 0;
            const width = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;
            const label = labelKey ? item[labelKey] : formatLabel(item);

            return (
              <div key={`${label}-${value}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="capitalize text-text-muted">{label}</span>
                  <span className="font-medium text-text">{formatValue(value)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted">
                  <div
                    className="h-2 rounded-full bg-text transition-all duration-300"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
