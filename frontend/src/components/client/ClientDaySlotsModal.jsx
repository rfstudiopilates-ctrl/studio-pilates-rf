import Modal from '../ui/Modal';
import { formatDateDisplay } from '../../lib/dates';

function SlotButton({
  classItem,
  isMine,
  isFull,
  dayAlreadyBooked,
  canBook,
  mode,
  isBusy,
  isLoading,
  onSelect,
}) {
  const spots = Number(classItem.spotsAvailable || 0);
  const booked = Number(classItem.bookedCount || 0);
  const capacity = Number(classItem.capacity || 0);
  const blockedBySameDay = mode === 'book' && dayAlreadyBooked && !isMine;
  const disabled =
    isMine ||
    isFull ||
    blockedBySameDay ||
    (mode === 'book' && !canBook) ||
    isBusy;

  let statusLabel = `${spots} libres`;
  if (isMine) statusLabel = 'Tuya';
  else if (blockedBySameDay) statusLabel = 'No disponible';
  else if (isFull) statusLabel = 'Llena';
  else if (mode === 'book' && !canBook) statusLabel = 'Sin cupo';
  else statusLabel = `${booked}/${capacity}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(classItem)}
      className={`flex min-h-[5.5rem] flex-col items-center justify-center rounded-2xl border px-1.5 py-2.5 text-center transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
        isMine
          ? 'border-emerald-200 bg-emerald-50'
          : blockedBySameDay
            ? 'border-border bg-surface-muted/60'
            : isFull
              ? 'border-amber-100 bg-amber-50/70'
              : disabled
                ? 'border-border bg-surface-muted/50'
                : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/60'
      }`}
    >
      <span className="text-sm font-semibold tabular-nums text-text">
        {isLoading ? '...' : classItem.startTime}
      </span>
      <span className="mt-0.5 text-[10px] tabular-nums text-text-muted">
        {classItem.endTime}
      </span>
      <span
        className={`mt-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          isMine
            ? 'bg-emerald-100 text-emerald-800'
            : blockedBySameDay
              ? 'bg-surface-muted text-text-muted'
              : isFull
                ? 'bg-amber-100 text-warning'
                : 'bg-surface-muted text-text-muted'
        }`}
      >
        {statusLabel}
      </span>
    </button>
  );
}

export default function ClientDaySlotsModal({
  open,
  onClose,
  selectedDate,
  classes = [],
  reservedClassIds = new Set(),
  dayAlreadyBooked = false,
  existingReservationTime = null,
  mode = 'book',
  excludeClassId = null,
  canBook = false,
  submittingClassId = null,
  onSelectClass,
}) {
  if (!selectedDate) {
    return null;
  }

  const visibleClasses = classes.filter((item) => item.id !== excludeClassId);
  const isBusy = Boolean(submittingClassId);
  const bookableCount = visibleClasses.filter((item) => {
    const isMine = reservedClassIds.has(item.id);
    if (isMine || item.isFull) return false;
    if (mode === 'book' && dayAlreadyBooked) return false;
    return true;
  }).length;

  const description =
    mode === 'change'
      ? 'Tocá el horario al que querés cambiar'
      : dayAlreadyBooked
        ? existingReservationTime
          ? `Ya tenés clase a las ${existingReservationTime}`
          : 'Ya tenés una clase este día'
        : visibleClasses.length === 0
          ? 'No hay horarios disponibles'
          : `${bookableCount} disponible${bookableCount === 1 ? '' : 's'} · ${visibleClasses.length} en total`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="capitalize">{formatDateDisplay(selectedDate)}</span>}
      description={description}
      size="md"
    >
      {mode === 'book' && dayAlreadyBooked ? (
        <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-xs text-text">
          Solo podés tener una clase por día. Cancelá tu reserva actual si querés
          elegir otro horario.
        </p>
      ) : null}

      {!canBook && mode === 'book' && !dayAlreadyBooked ? (
        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-warning">
          Necesitás un plan con cupos o un crédito de recuperación para reservar.
        </p>
      ) : null}

      {visibleClasses.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-text">Sin horarios disponibles</p>
          <p className="mt-1 text-xs text-text-muted">
            Los horarios que ya pasaron no se muestran. Probá otro día.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-medium text-text"
          >
            Volver al calendario
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {visibleClasses.map((classItem) => {
              const isMine = reservedClassIds.has(classItem.id);
              const isFull = Boolean(classItem.isFull);

              return (
                <SlotButton
                  key={classItem.id}
                  classItem={classItem}
                  isMine={isMine}
                  isFull={isFull}
                  dayAlreadyBooked={dayAlreadyBooked}
                  canBook={canBook}
                  mode={mode}
                  isBusy={isBusy}
                  isLoading={submittingClassId === classItem.id}
                  onSelect={onSelectClass}
                />
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-text-muted">
            {mode === 'change'
              ? 'El estudio confirmará el cambio de horario.'
              : dayAlreadyBooked
                ? 'Usá Cancelar en Mis clases para liberar el día.'
                : 'Tocá un horario libre para reservar.'}
          </p>
        </>
      )}
    </Modal>
  );
}
