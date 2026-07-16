import { useEffect, useRef, useState } from 'react';
import { CLASS_STATUS_LABELS } from '../../constants/schedules';
import { formatDateDisplay } from '../../lib/dates';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';

function getStatusBadgeClass(status) {
  if (status === 'cancelled') {
    return 'bg-red-50 text-danger border-red-100';
  }
  if (status === 'completed') {
    return 'bg-surface-muted text-text-muted border-border';
  }
  return 'bg-brand-50 text-text border-brand-100';
}

function getOccupancyTone(classItem) {
  const capacity = Number(classItem.capacity || 0);
  const booked = Number(classItem.bookedCount || 0);

  if (classItem.status === 'cancelled') return 'cancelled';
  if (capacity <= 0) return 'open';
  if (booked >= capacity || classItem.isFull) return 'full';
  if (booked / capacity >= 0.7) return 'busy';
  if (booked > 0) return 'active';
  return 'open';
}

function getCardToneClass(tone) {
  switch (tone) {
    case 'full':
      return 'border-amber-200 bg-amber-50/50';
    case 'busy':
      return 'border-orange-200 bg-orange-50/40';
    case 'active':
      return 'border-emerald-200 bg-emerald-50/40';
    case 'cancelled':
      return 'border-red-100 bg-red-50/40 opacity-80';
    default:
      return 'border-border bg-surface-muted/30';
  }
}

function OccupancyBar({ booked, capacity }) {
  const rate = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-muted">
        <span>
          {booked} de {capacity} cupos
        </span>
        <span>{rate}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
        <div
          className={`h-full rounded-full transition-all ${
            rate >= 100
              ? 'bg-warning'
              : rate >= 70
                ? 'bg-orange-400'
                : rate > 0
                  ? 'bg-emerald-400'
                  : 'bg-brand-300'
          }`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

function ClassCarouselCard({
  classItem,
  onSelectClass,
  onCancelClass,
  isCancelling,
}) {
  const tone = getOccupancyTone(classItem);
  const booked = Number(classItem.bookedCount || 0);
  const capacity = Number(classItem.capacity || 0);
  const free = Math.max(0, capacity - booked);

  return (
    <div className={`flex h-full min-h-46 flex-col rounded-2xl border p-4 ${getCardToneClass(tone)}`}>
      <button
        type="button"
        onClick={() => onSelectClass?.(classItem)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-text">
            {classItem.startTime} – {classItem.endTime}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {classItem.status === 'cancelled'
              ? 'Clase cancelada'
              : classItem.isFull
                ? 'Completa · sin cupos'
                : `${free} cupo${free === 1 ? '' : 's'} libre${free === 1 ? '' : 's'}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${getStatusBadgeClass(classItem.status)}`}
        >
          {CLASS_STATUS_LABELS[classItem.status]}
        </span>
      </button>

      {classItem.status !== 'cancelled' ? (
        <OccupancyBar booked={booked} capacity={capacity} />
      ) : null}

      {classItem.status === 'scheduled' ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs sm:text-sm"
            onClick={() => onSelectClass?.(classItem)}
          >
            Ver reservas
          </Button>
          {booked === 0 ? (
            <Button
              variant="ghost"
              className="h-9 px-3 text-xs text-danger sm:text-sm"
              onClick={() => onCancelClass?.(classItem)}
              isLoading={isCancelling}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ClassesDayDetail({
  selectedDate,
  classes = [],
  onSelectClass,
  onCancelClass,
  isCancelling,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedDate]);

  useEffect(() => {
    if (classes.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, classes.length - 1));
  }, [classes.length]);

  if (!selectedDate) {
    return (
      <section className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-6 text-center shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-text">
          <NavIcon name="calendar" className="h-7 w-7" />
        </div>
        <p className="mt-4 text-base font-medium text-text">Elegí un día</p>
        <p className="mt-1 max-w-xs text-sm text-text-muted">
          Tocá un día del calendario para ver los horarios, cupos y personas inscritas.
        </p>
      </section>
    );
  }

  const scheduled = classes.filter((item) => item.status === 'scheduled');
  const totalBooked = scheduled.reduce((sum, item) => sum + Number(item.bookedCount || 0), 0);
  const totalCapacity = scheduled.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
  const totalSlides = classes.length;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < totalSlides - 1;

  const goTo = (index) => {
    if (totalSlides === 0) return;
    setActiveIndex(Math.max(0, Math.min(index, totalSlides - 1)));
  };

  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (event) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = (event.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;

    if (Math.abs(delta) < 48) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
      <div className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Detalle del día
        </p>
        <h3 className="mt-1 text-base font-semibold capitalize text-text">
          {formatDateDisplay(selectedDate)}
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          {classes.length === 0
            ? 'Sin clases programadas'
            : `${scheduled.length} clase${scheduled.length === 1 ? '' : 's'} · ${totalBooked}/${totalCapacity || 0} alumnos`}
        </p>

        {totalCapacity > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface-muted/60 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Clases</p>
              <p className="mt-0.5 text-sm font-semibold text-text">{scheduled.length}</p>
            </div>
            <div className="rounded-xl bg-surface-muted/60 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Alumnos</p>
              <p className="mt-0.5 text-sm font-semibold text-text">{totalBooked}</p>
            </div>
            <div className="rounded-xl bg-surface-muted/60 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Libres</p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {Math.max(0, totalCapacity - totalBooked)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {classes.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-text">Sin clases este día</p>
          <p className="mt-1 text-xs text-text-muted">
            Si falta programación, revisá Horarios y luego generá las clases.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Horario{' '}
              <span className="font-semibold text-text">
                {activeIndex + 1} / {totalSlides}
              </span>
            </p>
            {totalSlides > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  aria-label="Horario anterior"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <NavIcon name="chevronLeft" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  aria-label="Horario siguiente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <NavIcon name="chevronRight" className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div
            className="min-w-0 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {classes.map((classItem) => (
                <div key={classItem.id} className="w-full min-w-0 shrink-0 grow-0 basis-full px-0.5">
                  <ClassCarouselCard
                    classItem={classItem}
                    onSelectClass={onSelectClass}
                    onCancelClass={onCancelClass}
                    isCancelling={isCancelling}
                  />
                </div>
              ))}
            </div>
          </div>

          {totalSlides > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {classes.map((classItem, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={classItem.id}
                    type="button"
                    aria-label={`Ir al horario ${classItem.startTime}`}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => goTo(index)}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? 'w-6 bg-text'
                        : 'w-2 bg-border hover:bg-text-muted'
                    }`}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
