import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import { formatDateDisplay, normalizeDateInput } from '../../lib/dates';

export default function ConfirmBookingModal({
  open,
  classItem,
  mode = 'book',
  requestMode = false,
  isSubmitting = false,
  fromReservation = null,
  onClose,
  onConfirm,
}) {
  if (!classItem) {
    return null;
  }

  const classDate = normalizeDateInput(classItem.classDate);
  const isChange = mode === 'change';

  const title = isChange
    ? 'Confirmar cambio'
    : requestMode
      ? 'Confirmar solicitud'
      : 'Confirmar reserva';

  const description = isChange
    ? 'Vas a pedir cambiar tu clase a este horario. El estudio lo tiene que aprobar.'
    : requestMode
      ? 'Vas a pedir este turno. El estudio lo confirma cuando se pague la seña.'
      : 'Vas a reservar este turno con tu plan activo.';

  const confirmLabel = isChange
    ? 'Sí, pedir cambio'
    : requestMode
      ? 'Sí, pedir turno'
      : 'Sí, reservar';

  return (
    <Modal open={open} onClose={isSubmitting ? () => {} : onClose} title={title} description={description} size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-text">
              <NavIcon name="calendar" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {isChange ? 'Nuevo horario' : 'Turno elegido'}
              </p>
              <p className="mt-1 text-base font-semibold capitalize text-text">
                {formatDateDisplay(classDate)}
              </p>
              <p className="mt-0.5 text-sm text-text-muted">
                {classItem.startTime}
                {classItem.endTime ? ` – ${classItem.endTime}` : ''}
              </p>
            </div>
          </div>
        </div>

        {isChange && fromReservation ? (
          <div className="rounded-2xl border border-border bg-white px-4 py-3.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Horario actual
            </p>
            <p className="mt-1 capitalize text-text">
              {formatDateDisplay(fromReservation.classDate)} · {fromReservation.startTime}
            </p>
          </div>
        ) : null}

        {requestMode && !isChange ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-xs text-text">
            El cupo queda aparte mientras el estudio gestiona la seña. Podés cancelar la
            solicitud si todavía no fue confirmada.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            isLoading={isSubmitting}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
