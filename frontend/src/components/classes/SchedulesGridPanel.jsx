import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import NavIcon from '../ui/NavIcon';
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '../../constants/schedules';
import { useAdminSettings } from '../../hooks/useSettings';
import { useReplaceWeeklySchedule, useWeeklySchedule } from '../../hooks/useSchedules';
import { getErrorMessage } from '../../lib/formErrors';

function createEmptyGrid() {
  return DAY_OF_WEEK_ORDER.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});
}

function slotsToGrid(slots = []) {
  const grid = createEmptyGrid();
  for (const slot of slots) {
    grid[slot.dayOfWeek].push(String(slot.startTime).slice(0, 5));
  }

  for (const day of DAY_OF_WEEK_ORDER) {
    grid[day] = [...new Set(grid[day])].sort();
  }

  return grid;
}

function gridToSlots(grid, { capacity, durationMinutes } = {}) {
  const slots = [];

  for (const day of DAY_OF_WEEK_ORDER) {
    for (const startTime of grid[day]) {
      slots.push({
        dayOfWeek: day,
        startTime,
        capacity: capacity || undefined,
        durationMinutes: durationMinutes || undefined,
      });
    }
  }

  return slots;
}

function gridsEqual(a, b) {
  return DAY_OF_WEEK_ORDER.every(
    (day) => JSON.stringify(a[day] || []) === JSON.stringify(b[day] || [])
  );
}

const QUICK_TIMES = ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'];

export default function SchedulesGridPanel() {
  const { data: scheduleData, isLoading, isError } = useWeeklySchedule();
  const { data: settings } = useAdminSettings();
  const replaceSchedule = useReplaceWeeklySchedule();

  const [grid, setGrid] = useState(createEmptyGrid);
  const [savedGrid, setSavedGrid] = useState(createEmptyGrid);
  const [activeDay, setActiveDay] = useState(null);
  const [modalView, setModalView] = useState('list');
  const [modalTime, setModalTime] = useState('09:00');
  const [copyFromDay, setCopyFromDay] = useState(1);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (scheduleData?.slots) {
      const nextGrid = slotsToGrid(scheduleData.slots);
      setGrid(nextGrid);
      setSavedGrid(nextGrid);
    }
  }, [scheduleData]);

  const totalSlots = useMemo(
    () => DAY_OF_WEEK_ORDER.reduce((sum, day) => sum + grid[day].length, 0),
    [grid]
  );

  const isDirty = useMemo(() => !gridsEqual(grid, savedGrid), [grid, savedGrid]);
  const durationMinutes = settings?.classDurationMinutes || 60;
  const capacity = settings?.maxClassCapacity || 6;
  const activeSlots = activeDay ? grid[activeDay] || [] : [];

  function openDayModal(day) {
    setActiveDay(day);
    setModalView('list');
    setModalTime('09:00');
    setCopyFromDay(DAY_OF_WEEK_ORDER.find((item) => item !== day) || 1);
    setFeedback(null);
  }

  function closeDayModal() {
    setActiveDay(null);
    setModalView('list');
  }

  function addSlot() {
    if (!activeDay || !modalTime) {
      return;
    }

    const time = modalTime.slice(0, 5);

    if (grid[activeDay].includes(time)) {
      setFeedback({
        type: 'error',
        message: `Ya existe ${time} el ${DAY_OF_WEEK_LABELS[activeDay]}.`,
      });
      return;
    }

    setGrid((current) => ({
      ...current,
      [activeDay]: [...current[activeDay], time].sort(),
    }));
    setModalView('list');
    setFeedback({
      type: 'success',
      message: `Se agregó ${time} a ${DAY_OF_WEEK_LABELS[activeDay]}. Guardá para aplicar la plantilla.`,
    });
  }

  function removeSlot(time) {
    if (!activeDay) {
      return;
    }

    setGrid((current) => ({
      ...current,
      [activeDay]: current[activeDay].filter((slotTime) => slotTime !== time),
    }));
  }

  function clearDay() {
    if (!activeDay || grid[activeDay].length === 0) {
      return;
    }

    if (!window.confirm(`¿Quitar todos los horarios de ${DAY_OF_WEEK_LABELS[activeDay]}?`)) {
      return;
    }

    setGrid((current) => ({ ...current, [activeDay]: [] }));
    setFeedback({
      type: 'success',
      message: `Se vació ${DAY_OF_WEEK_LABELS[activeDay]}. Guardá para aplicar la plantilla.`,
    });
  }

  function copyDaySlots() {
    if (!activeDay) {
      return;
    }

    const sourceSlots = grid[copyFromDay] || [];

    if (sourceSlots.length === 0) {
      setFeedback({
        type: 'error',
        message: `${DAY_OF_WEEK_LABELS[copyFromDay]} no tiene horarios para copiar.`,
      });
      return;
    }

    setGrid((current) => ({
      ...current,
      [activeDay]: [...new Set([...current[activeDay], ...sourceSlots])].sort(),
    }));
    setModalView('list');
    setFeedback({
      type: 'success',
      message: `Se copiaron ${sourceSlots.length} horario(s) de ${DAY_OF_WEEK_LABELS[copyFromDay]} a ${DAY_OF_WEEK_LABELS[activeDay]}.`,
    });
  }

  function discardChanges() {
    setGrid(savedGrid);
    setFeedback({ type: 'success', message: 'Cambios descartados.' });
  }

  async function handleSave() {
    setFeedback(null);

    try {
      const result = await replaceSchedule.mutateAsync(
        gridToSlots(grid, { capacity, durationMinutes })
      );
      const nextGrid = slotsToGrid(result.slots || gridToSlots(grid, { capacity, durationMinutes }));
      setGrid(nextGrid);
      setSavedGrid(nextGrid);
      setFeedback({
        type: 'success',
        message: `Plantilla guardada. Se generaron ${result.generation?.created ?? 0} clases nuevas hacia adelante.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo guardar la plantilla de horarios.'),
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="schedule" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Plantilla semanal fija</p>
              <p className="mt-1 max-w-2xl text-sm text-text-muted">
                Configurá los horarios habituales del estudio. Se repiten todas las semanas
                automáticamente. Si necesitás cancelar o ajustar una clase de un día puntual,
                hacelo desde la tab <strong className="text-text">Clases</strong>.
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Duración: <strong className="text-text">{durationMinutes} min</strong>
                {' · '}
                Cupos: <strong className="text-text">{capacity}</strong>
                {' · '}
                Horarios: <strong className="text-text">{totalSlots}</strong>
                {isDirty ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-warning">
                    Sin guardar
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            {isDirty ? (
              <Button variant="secondary" onClick={discardChanges} className="w-full sm:w-auto">
                Descartar
              </Button>
            ) : null}
            <Button
              onClick={handleSave}
              isLoading={replaceSchedule.isPending}
              disabled={isLoading || !isDirty}
              className="w-full sm:w-auto"
            >
              Guardar plantilla
            </Button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4">
            <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
              {feedback.message}
            </Alert>
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <Alert variant="error">No se pudo cargar la plantilla de horarios.</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          Cargando horarios...
        </div>
      ) : (
        <section className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DAY_OF_WEEK_ORDER.map((day) => {
            const slots = grid[day];

            return (
              <button
                key={day}
                type="button"
                onClick={() => openDayModal(day)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-4 text-left shadow-[0_8px_30px_rgba(26,26,26,0.04)] transition hover:border-brand-300 hover:bg-brand-50/40 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text">{DAY_OF_WEEK_LABELS[day]}</p>
                  <p className="text-xs text-text-muted">
                    {slots.length === 0
                      ? 'Sin horarios fijos'
                      : `${slots.length} horario${slots.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <NavIcon name="chevronRight" className="h-4 w-4 shrink-0 text-text-muted" />
              </button>
            );
          })}
        </section>
      )}

      {isDirty ? (
        <div className="sticky bottom-4 z-10 rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-[0_12px_40px_rgba(26,26,26,0.12)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">
              Tenés cambios sin guardar en la plantilla semanal.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={discardChanges} className="w-full sm:w-auto">
                Descartar
              </Button>
              <Button
                onClick={handleSave}
                isLoading={replaceSchedule.isPending}
                className="w-full sm:w-auto"
              >
                Guardar plantilla
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(activeDay)}
        onClose={closeDayModal}
        title={activeDay ? DAY_OF_WEEK_LABELS[activeDay] : 'Horarios'}
        description={
          activeDay
            ? modalView === 'add'
              ? `Agregá un horario fijo para ${DAY_OF_WEEK_LABELS[activeDay]}.`
              : modalView === 'copy'
                ? `Copiá horarios hacia ${DAY_OF_WEEK_LABELS[activeDay]}.`
                : `${activeSlots.length} horario${activeSlots.length === 1 ? '' : 's'} · ${durationMinutes} min · ${capacity} cupos`
            : ''
        }
        size="lg"
      >
        {modalView === 'list' && activeDay ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCopyFromDay(DAY_OF_WEEK_ORDER.find((item) => item !== activeDay) || 1);
                  setModalView('copy');
                }}
              >
                Copiar desde otro día
              </Button>
              {activeSlots.length > 0 ? (
                <Button
                  variant="ghost"
                  className="w-full text-danger sm:w-auto"
                  onClick={clearDay}
                >
                  Vaciar día
                </Button>
              ) : null}
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setModalTime('09:00');
                  setModalView('add');
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <NavIcon name="plus" className="h-4 w-4" />
                  Agregar horario
                </span>
              </Button>
            </div>

            {activeSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-10 text-center">
                <p className="text-sm font-medium text-text">Este día no tiene clases fijas</p>
                <p className="mt-1 text-xs text-text-muted">
                  Agregá un horario o copiá la grilla de otro día.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {activeSlots.map((time) => (
                  <li
                    key={`${activeDay}-${time}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/30 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text">{time}</p>
                      <p className="text-xs text-text-muted">
                        {durationMinutes} min · {capacity} cupos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(time)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-red-50"
                    >
                      <NavIcon name="trash" className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end border-t border-border pt-5">
              <Button variant="secondary" onClick={closeDayModal} className="w-full sm:w-auto">
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}

        {modalView === 'add' && activeDay ? (
          <div className="space-y-5">
            <Input
              label="Hora de inicio"
              type="time"
              value={modalTime}
              onChange={(event) => setModalTime(event.target.value)}
              autoFocus
            />

            <div>
              <p className="mb-2 text-sm font-medium text-text">Horarios rápidos</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setModalTime(time)}
                    className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                      modalTime === time
                        ? 'border-brand-300 bg-brand-50 font-medium text-text'
                        : 'border-border bg-white text-text-muted hover:border-brand-200'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalView('list')}
                className="w-full sm:w-auto"
              >
                Volver
              </Button>
              <Button type="button" onClick={addSlot} className="w-full sm:w-auto">
                Agregar a la plantilla
              </Button>
            </div>
          </div>
        ) : null}

        {modalView === 'copy' && activeDay ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-text">Copiar desde</p>
              <div className="flex flex-wrap gap-2">
                {DAY_OF_WEEK_ORDER.filter((day) => day !== activeDay).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setCopyFromDay(day)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      copyFromDay === day
                        ? 'border-brand-300 bg-brand-50 font-medium text-text'
                        : 'border-border bg-white text-text-muted hover:border-brand-200'
                    }`}
                  >
                    {DAY_OF_WEEK_LABELS[day]}
                    <span className="ml-1 text-xs text-text-muted">({grid[day].length})</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-text-muted">
              Se van a sumar estos horarios a {DAY_OF_WEEK_LABELS[activeDay]} sin borrar los que ya
              existen: {(grid[copyFromDay] || []).join(', ') || 'ninguno'}.
            </p>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalView('list')}
                className="w-full sm:w-auto"
              >
                Volver
              </Button>
              <Button type="button" onClick={copyDaySlots} className="w-full sm:w-auto">
                Copiar horarios
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
