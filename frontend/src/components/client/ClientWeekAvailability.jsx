import { useMemo } from 'react';
import { Button } from '../ui/Button';
import {
  addDaysToDate,
  formatDateDisplay,
  formatMonthYear,
  formatWeekRange,
  getIsoWeekday,
  isClassPast,
  normalizeDateInput,
} from '../../lib/dates';
import { DAY_OF_WEEK_LABELS } from '../../constants/schedules';

function isSlotAvailable(classItem, { reservedClassIds, excludeClassId, mode }) {
  if (!classItem) return false;
  if (excludeClassId && classItem.id === excludeClassId) return false;
  if (isClassPast(classItem.classDate, classItem.startTime)) return false;
  if (classItem.isFull || Number(classItem.spotsAvailable || 0) <= 0) return false;
  if (mode === 'book' && reservedClassIds.has(classItem.id)) return false;
  return true;
}

function SlotChip({
  classItem,
  isMine,
  disabled,
  isLoading,
  onSelect,
  requestMode = false,
}) {
  const spots = Number(classItem.spotsAvailable || 0);

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={() => onSelect?.(classItem)}
      className={`flex min-h-[4.75rem] flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
        isMine
          ? 'border-emerald-200 bg-emerald-50'
          : disabled
            ? 'border-border bg-surface-muted/50'
            : 'border-border bg-white hover:border-text/25 hover:bg-surface-muted/50'
      }`}
    >
      <span className="text-sm font-semibold tabular-nums text-text">
        {isLoading ? '...' : classItem.startTime}
      </span>
      <span className="mt-0.5 text-[10px] tabular-nums text-text-muted">
        {classItem.endTime}
      </span>
      <span
        className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          isMine ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-muted text-text-muted'
        }`}
      >
        {isMine
          ? 'Tuya'
          : requestMode
            ? 'Pedir'
            : `${spots} libre${spots === 1 ? '' : 's'}`}
      </span>
    </button>
  );
}

export default function ClientWeekAvailability({
  weekStart,
  weekOffset,
  onWeekOffsetChange,
  grouped = {},
  reservedClassIds = new Set(),
  reservedDates = new Map(),
  mode = 'book',
  excludeClassId = null,
  canBook = false,
  requestMode = false,
  submittingClassId = null,
  planHint = '',
  recoveryCredits = [],
  selectedCreditId = '',
  onCreditChange,
  onSelectClass,
  isLoading = false,
  isRefreshing = false,
}) {
  const weekEnd = addDaysToDate(weekStart, 6);
  const weekLabel = formatWeekRange(weekStart, weekEnd);
  const monthLabel = formatMonthYear(weekStart);
  const isCurrentWeek = weekOffset === 0;
  const isNextWeek = weekOffset === 1;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDaysToDate(weekStart, index);
      const dayOfWeek = getIsoWeekday(date);
      const classes = (grouped[date] || []).filter((item) =>
        isSlotAvailable(item, { reservedClassIds, excludeClassId, mode })
      );
      const reservation = reservedDates.get(date) || null;

      return {
        date,
        dayOfWeek,
        label: DAY_OF_WEEK_LABELS[dayOfWeek] || formatDateDisplay(date),
        classes,
        reservation,
      };
    }).filter((day) => {
      // En modo reserva no mostramos días que ya tienen turno del cliente.
      if (mode === 'book' && day.reservation) {
        return false;
      }

      return day.classes.length > 0;
    });
  }, [weekStart, grouped, reservedClassIds, reservedDates, excludeClassId, mode]);

  const showEmpty = !isLoading && !isRefreshing && days.length === 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {isCurrentWeek ? 'Esta semana' : 'Próxima semana'}
            </p>
            <h2 className="mt-1 text-lg font-semibold capitalize text-text">{monthLabel}</h2>
            <p className="mt-0.5 text-sm text-text-muted">{weekLabel}</p>
            <p className="mt-2 text-sm text-text-muted">
              {mode === 'change' ? 'Elegí el nuevo horario disponible' : planHint}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface-muted/40 p-1 sm:w-[17rem]"
            role="tablist"
            aria-label="Semana a consultar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isCurrentWeek}
              disabled={isCurrentWeek}
              onClick={() => onWeekOffsetChange(0)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:cursor-default ${
                isCurrentWeek
                  ? 'bg-white text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Esta semana
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isNextWeek}
              disabled={isNextWeek}
              onClick={() => onWeekOffsetChange(1)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:cursor-default ${
                isNextWeek
                  ? 'bg-white text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Próxima
            </button>
          </div>
        </div>

        {mode === 'book' && recoveryCredits.length > 0 ? (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
            <p className="text-xs font-medium text-text">Crédito de recuperación</p>
            <select
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
              value={selectedCreditId}
              onChange={(event) => onCreditChange?.(event.target.value)}
            >
              <option value="">Usar plan (sin crédito)</option>
              {recoveryCredits.map((credit) => (
                <option key={credit.id} value={credit.id}>
                  Crédito #{credit.id} · vence {normalizeDateInput(credit.expiresAt)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!canBook && mode === 'book' ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">
            No podés reservar ahora: necesitás un plan con cupos o un crédito de recuperación.
          </div>
        ) : null}

        {requestMode && canBook && mode === 'book' ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-sm text-text">
            Este pedido queda pendiente hasta que el estudio confirme la seña. El cupo se
            reserva mientras se gestiona.
          </div>
        ) : null}

        <p className="mt-4 text-xs text-text-muted">
          {requestMode
            ? 'Solo podés pedir turnos de esta semana o la próxima. Se muestran únicamente horarios con lugar disponible.'
            : 'Solo podés reservar en esta semana o la próxima. Se muestran únicamente horarios con lugar disponible.'}
        </p>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-muted">
          Cargando horarios de la semana...
        </div>
      ) : showEmpty ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-6 text-center">
          <p className="text-sm font-semibold text-text">Sin horarios disponibles</p>
          <p className="mt-1 text-sm text-text-muted">
            {isCurrentWeek
              ? 'No quedan turnos libres esta semana. Probá la próxima.'
              : 'No hay turnos libres en la próxima semana.'}
          </p>
          {isCurrentWeek ? (
            <Button className="mt-4" onClick={() => onWeekOffsetChange(1)}>
              Ver próxima semana
            </Button>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => onWeekOffsetChange(0)}>
              Volver a esta semana
            </Button>
          )}
        </section>
      ) : (
        <div
          className={`relative space-y-3 transition-opacity duration-200 ${
            isRefreshing ? 'pointer-events-none opacity-55' : 'opacity-100'
          }`}
        >
          {isRefreshing ? (
            <p className="absolute inset-x-0 top-3 z-10 text-center text-xs font-medium text-text-muted">
              Actualizando horarios...
            </p>
          ) : null}

          {days.map((day) => (
              <section
                key={day.date}
                className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-text">{day.label}</h3>
                    <p className="mt-0.5 text-sm capitalize text-text-muted">
                      {formatDateDisplay(day.date)}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {day.classes.length} disponible{day.classes.length === 1 ? '' : 's'}
                  </span>
                </div>

                {day.classes.length === 0 ? (
                  <p className="mt-3 text-sm text-text-muted">No hay turnos libres este día.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {day.classes.map((classItem) => {
                      const isMine = reservedClassIds.has(classItem.id);
                      const blocked =
                        (mode === 'book' && !canBook) || (mode === 'change' && isMine);

                      return (
                        <SlotChip
                          key={classItem.id}
                          classItem={classItem}
                          isMine={isMine}
                          disabled={blocked}
                          isLoading={submittingClassId === classItem.id}
                          onSelect={onSelectClass}
                          requestMode={requestMode}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ))}

          {isRefreshing && days.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-muted">
              Cargando horarios de la semana...
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
