import { useEffect, useMemo, useState } from 'react';
import { useClassesAvailability } from '../../hooks/useClasses';
import {
  addDaysToDate,
  formatDateDisplay,
  getTodayInArgentina,
  isClassPast,
  normalizeDateInput,
} from '../../lib/dates';

const REASSIGN_WINDOW_DAYS = 14;

function buildDayKeys(fromDate, days) {
  return Array.from({ length: days }, (_, index) => addDaysToDate(fromDate, index));
}

function isAssignableClass(classItem, excludeClassId) {
  if (!classItem) return false;
  if (excludeClassId && Number(classItem.id) === Number(excludeClassId)) return false;
  if (classItem.status && classItem.status !== 'scheduled') return false;
  if (isClassPast(classItem.classDate, classItem.startTime)) return false;
  if (classItem.isFull || Number(classItem.spotsAvailable || 0) <= 0) return false;
  return true;
}

/**
 * Selector visual de clase destino para reasignar / cambiar horario.
 * Solo muestra turnos futuros (no pasados) hasta 2 semanas.
 */
export default function ReassignClassPicker({
  excludeClassId = null,
  value = '',
  onChange,
  disabled = false,
  label = 'Nueva clase',
}) {
  const today = getTodayInArgentina();
  const to = addDaysToDate(today, REASSIGN_WINDOW_DAYS - 1);

  const { data: availability, isLoading } = useClassesAvailability({
    from: today,
    to,
  });

  const availableClasses = useMemo(
    () =>
      (availability?.items || [])
        .filter((item) => isAssignableClass(item, excludeClassId))
        .sort((a, b) => {
          const dateCmp = String(a.classDate).localeCompare(String(b.classDate));
          if (dateCmp !== 0) return dateCmp;
          return String(a.startTime).localeCompare(String(b.startTime));
        }),
    [availability, excludeClassId]
  );

  const classesByDate = useMemo(() => {
    const map = new Map();
    for (const classItem of availableClasses) {
      const dateKey = normalizeDateInput(classItem.classDate);
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(classItem);
    }
    return map;
  }, [availableClasses]);

  const dayKeys = useMemo(() => {
    const allDays = buildDayKeys(today, REASSIGN_WINDOW_DAYS);
    const withSlots = allDays.filter((day) => (classesByDate.get(day) || []).length > 0);
    return withSlots.length > 0 ? withSlots : allDays.slice(0, 1);
  }, [today, classesByDate]);

  const [selectedDate, setSelectedDate] = useState(() => dayKeys[0] || today);

  useEffect(() => {
    if (!dayKeys.includes(selectedDate)) {
      setSelectedDate(dayKeys[0] || today);
    }
  }, [dayKeys, selectedDate, today]);

  // Si el valor seleccionado queda inválido (pasó / se llenó), limpiarlo.
  useEffect(() => {
    if (!value) return;
    const stillValid = availableClasses.some((item) => String(item.id) === String(value));
    if (!stillValid) {
      onChange?.('');
    }
  }, [value, availableClasses, onChange]);

  const daySlots = classesByDate.get(selectedDate) || [];
  const selectedClass = availableClasses.find((item) => String(item.id) === String(value));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Próximas 2 semanas · sin horarios ya pasados
        </p>
      </div>

      {isLoading ? (
        <p className="rounded-xl border border-border bg-surface-muted/40 px-3 py-4 text-center text-sm text-text-muted">
          Cargando horarios…
        </p>
      ) : availableClasses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-4 text-center text-sm text-text-muted">
          No hay clases con cupo libre en las próximas 2 semanas.
        </p>
      ) : (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {dayKeys.map((day) => {
              const count = (classesByDate.get(day) || []).length;
              const isActive = day === selectedDate;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled || count === 0}
                  onClick={() => setSelectedDate(day)}
                  className={`min-w-[4.75rem] shrink-0 rounded-xl border px-2.5 py-2 text-center transition ${
                    isActive
                      ? 'border-text bg-text text-white'
                      : count === 0
                        ? 'border-border bg-surface-muted/40 text-text-muted opacity-50'
                        : 'border-border bg-white text-text hover:border-brand-300 hover:bg-brand-50/60'
                  }`}
                >
                  <span className="block text-[11px] font-semibold capitalize leading-tight">
                    {formatDateDisplay(day)}
                  </span>
                  <span
                    className={`mt-1 block text-[10px] ${
                      isActive ? 'text-white/80' : 'text-text-muted'
                    }`}
                  >
                    {count} turno{count === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </div>

          {daySlots.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-muted/40 px-3 py-4 text-center text-sm text-text-muted">
              No hay cupos libres este día.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((classItem) => {
                const isSelected = String(classItem.id) === String(value);
                const spots = Number(classItem.spotsAvailable || 0);

                return (
                  <button
                    key={classItem.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(String(classItem.id))}
                    className={`flex min-h-[4.75rem] flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
                      isSelected
                        ? 'border-text bg-text text-white shadow-sm'
                        : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/60'
                    }`}
                  >
                    <span className="text-sm font-semibold tabular-nums">
                      {classItem.startTime}
                    </span>
                    <span
                      className={`mt-0.5 text-[10px] tabular-nums ${
                        isSelected ? 'text-white/75' : 'text-text-muted'
                      }`}
                    >
                      {classItem.endTime}
                    </span>
                    <span
                      className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-surface-muted text-text-muted'
                      }`}
                    >
                      {spots} libre{spots === 1 ? '' : 's'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedClass ? (
            <p className="rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2 text-xs text-text">
              Seleccionado:{' '}
              <span className="font-semibold capitalize">
                {formatDateDisplay(selectedClass.classDate)} · {selectedClass.startTime}
              </span>
            </p>
          ) : (
            <p className="text-xs text-text-muted">Elegí un día y un horario disponible.</p>
          )}
        </>
      )}
    </div>
  );
}
