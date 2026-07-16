import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '../../constants/schedules';
import {
  formatDateDisplay,
  getMonthCalendarDays,
  getTodayInArgentina,
} from '../../lib/dates';

function summarizeDay(classes = []) {
  const scheduled = classes.filter((item) => item.status === 'scheduled');
  const cancelled = classes.filter((item) => item.status === 'cancelled');
  const booked = scheduled.reduce((sum, item) => sum + Number(item.bookedCount || 0), 0);
  const capacity = scheduled.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
  const hasFull = scheduled.some((item) => item.isFull || Number(item.spotsAvailable) === 0);
  const hasAlmostFull = scheduled.some((item) => {
    const cap = Number(item.capacity || 0);
    const used = Number(item.bookedCount || 0);
    return cap > 0 && !item.isFull && used / cap >= 0.7;
  });
  const occupancyRate = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;

  let tone = 'empty';
  if (scheduled.length > 0) {
    if (hasFull) tone = 'full';
    else if (hasAlmostFull) tone = 'busy';
    else if (booked > 0) tone = 'active';
    else tone = 'open';
  } else if (cancelled.length > 0) {
    tone = 'cancelled';
  }

  return {
    count: classes.length,
    scheduledCount: scheduled.length,
    cancelledCount: cancelled.length,
    booked,
    capacity,
    occupancyRate,
    hasFull,
    hasAlmostFull,
    tone,
  };
}

function getDayToneClasses(tone, isSelected, isPast) {
  if (isPast) {
    return 'cursor-default bg-surface-muted/40 text-text-muted';
  }

  if (isSelected) {
    return 'bg-brand-50 ring-2 ring-inset ring-brand-300';
  }

  switch (tone) {
    case 'full':
      return 'bg-amber-50/70 hover:bg-amber-50';
    case 'busy':
      return 'bg-orange-50/50 hover:bg-orange-50/80';
    case 'active':
      return 'bg-emerald-50/40 hover:bg-emerald-50/70';
    case 'open':
      return 'bg-brand-50/30 hover:bg-brand-50/60';
    case 'cancelled':
      return 'bg-red-50/40 hover:bg-red-50/70';
    default:
      return 'hover:bg-surface-muted/60';
  }
}

function getDotClasses(tone) {
  switch (tone) {
    case 'full':
      return 'bg-warning';
    case 'busy':
      return 'bg-orange-500';
    case 'active':
      return 'bg-emerald-500';
    case 'open':
      return 'bg-brand-300';
    case 'cancelled':
      return 'bg-danger';
    default:
      return 'bg-border';
  }
}

export default function ClassesMonthCalendar({
  monthStart,
  grouped = {},
  selectedDate,
  onSelectDate,
  isLoading,
}) {
  const today = getTodayInArgentina();
  const days = getMonthCalendarDays(monthStart);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/70">
        {DAY_OF_WEEK_ORDER.map((day) => (
          <div
            key={day}
            className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs"
          >
            <span className="sm:hidden">{DAY_OF_WEEK_LABELS[day].slice(0, 1)}</span>
            <span className="hidden sm:inline">{DAY_OF_WEEK_LABELS[day].slice(0, 3)}</span>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7">
        {days.map((cell) => {
          const isPast = cell.date < today;
          const dayClasses = isPast ? [] : grouped[cell.date] || [];
          const summary = summarizeDay(dayClasses);
          const hasClasses = summary.count > 0;
          const isSelected = !isPast && selectedDate === cell.date;
          const isToday = today === cell.date;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={isPast}
              aria-disabled={isPast}
              onClick={() => {
                if (!isPast) {
                  onSelectDate?.(cell.date);
                }
              }}
              className={`min-h-[4.75rem] border-b border-r border-border p-1.5 text-left transition sm:min-h-[6rem] sm:p-2 ${
                cell.inCurrentMonth || isPast ? '' : 'opacity-45'
              } ${getDayToneClasses(summary.tone, isSelected, isPast)} ${
                isPast || !cell.inCurrentMonth ? 'text-text-muted' : 'text-text'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ${
                    isPast
                      ? 'text-text-muted/50'
                      : isToday
                        ? 'bg-text text-white'
                        : isSelected
                          ? 'bg-brand-200 text-text'
                          : ''
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              {isPast ? (
                <p className="mt-2 hidden text-[10px] text-text-muted/40 sm:block">Pasado</p>
              ) : hasClasses ? (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDotClasses(summary.tone)}`}
                    />
                    <p className="truncate text-[10px] font-medium text-text sm:text-xs">
                      {summary.booked}/{summary.capacity || '—'}
                    </p>
                  </div>

                  {summary.capacity > 0 ? (
                    <div className="hidden h-1 overflow-hidden rounded-full bg-border/70 sm:block">
                      <div
                        className={`h-full rounded-full ${
                          summary.tone === 'full'
                            ? 'bg-warning'
                            : summary.tone === 'busy'
                              ? 'bg-orange-400'
                              : summary.tone === 'active'
                                ? 'bg-emerald-400'
                                : 'bg-brand-300'
                        }`}
                        style={{ width: `${Math.min(100, summary.occupancyRate)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 hidden text-[10px] text-text-muted/60 sm:block">Sin clases</p>
              )}
            </button>
          );
        })}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <p className="rounded-full bg-white px-4 py-2 text-sm text-text-muted shadow-sm">
              Actualizando...
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-muted/30 px-4 py-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          {selectedDate ? (
            <>
              Día seleccionado:{' '}
              <span className="font-medium capitalize text-text">
                {formatDateDisplay(selectedDate)}
              </span>
            </>
          ) : (
            'Seleccioná un día para ver los horarios y cupos.'
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-300" /> Libre
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Con alumnos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" /> Casi llena
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> Completa
          </span>
        </div>
      </div>
    </div>
  );
}
