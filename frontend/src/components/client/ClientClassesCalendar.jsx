import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '../../constants/schedules';
import {
  formatDateDisplay,
  getMonthCalendarDays,
  getTodayInArgentina,
} from '../../lib/dates';

function summarizeDay(classes = [], reservedClassIds = new Set()) {
  const open = classes.filter((item) => !item.isFull && !reservedClassIds.has(item.id));
  const reservedHere = classes.filter((item) => reservedClassIds.has(item.id));

  let tone = 'empty';
  if (reservedHere.length > 0) tone = 'mine';
  else if (open.length > 0) tone = 'open';
  else if (classes.length > 0) tone = 'full';

  return {
    count: classes.length,
    openCount: open.length,
    mineCount: reservedHere.length,
    tone,
  };
}

function dayToneClass(tone, isSelected) {
  if (isSelected) return 'bg-brand-50 ring-2 ring-inset ring-brand-300';
  if (tone === 'mine') return 'bg-emerald-50/80';
  if (tone === 'open') return 'bg-brand-50/40';
  if (tone === 'full') return 'bg-amber-50/50';
  return '';
}

export default function ClientClassesCalendar({
  monthStart,
  grouped = {},
  selectedDate,
  onSelectDate,
  reservedClassIds = new Set(),
  isLoading,
}) {
  const today = getTodayInArgentina();
  const days = getMonthCalendarDays(monthStart);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/70">
        {DAY_OF_WEEK_ORDER.map((day) => (
          <div
            key={day}
            className="px-0.5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted"
          >
            {DAY_OF_WEEK_LABELS[day].slice(0, 1)}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7">
        {days.map((cell) => {
          const dayClasses = grouped[cell.date] || [];
          const summary = summarizeDay(dayClasses, reservedClassIds);
          const isSelected = selectedDate === cell.date;
          const isToday = today === cell.date;
          const isPast = cell.date < today;
          const canOpen = summary.count > 0;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={isPast && !canOpen}
              onClick={() => onSelectDate?.(cell.date)}
              className={`min-h-[3.75rem] border-b border-r border-border p-1 text-left transition active:scale-[0.98] sm:min-h-[4.5rem] sm:p-1.5 ${
                cell.inCurrentMonth ? '' : 'opacity-40'
              } ${isPast && !canOpen ? 'opacity-40' : ''} ${dayToneClass(summary.tone, isSelected)}`}
            >
              <div className="flex items-start justify-between gap-0.5">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? 'bg-text text-white'
                      : isSelected
                        ? 'bg-brand-200 text-text'
                        : 'text-text'
                  }`}
                >
                  {cell.day}
                </span>
                {summary.count > 0 ? (
                  <span
                    className={`rounded-full px-1 py-0.5 text-[9px] font-semibold ${
                      summary.tone === 'mine'
                        ? 'bg-emerald-100 text-emerald-800'
                        : summary.tone === 'full'
                          ? 'bg-amber-100 text-warning'
                          : 'bg-brand-100 text-text'
                    }`}
                  >
                    {summary.openCount || summary.count}
                  </span>
                ) : null}
              </div>

              {summary.count > 0 ? (
                <p className="mt-1 truncate text-[9px] text-text-muted sm:text-[10px]">
                  {summary.mineCount > 0
                    ? 'Tu clase'
                    : summary.openCount > 0
                      ? `${summary.openCount} disp.`
                      : 'Completo'}
                </p>
              ) : null}
            </button>
          );
        })}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <p className="rounded-full bg-white px-3 py-1.5 text-xs text-text-muted shadow-sm">
              Actualizando...
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-muted/30 px-3 py-2.5 text-[11px] text-text-muted">
        <span>
          {selectedDate ? (
            <span className="capitalize">{formatDateDisplay(selectedDate)}</span>
          ) : (
            'Tocá un día para ver horarios'
          )}
        </span>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-300" /> Disponible
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Tuya
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Llena
          </span>
        </div>
      </div>
    </div>
  );
}
