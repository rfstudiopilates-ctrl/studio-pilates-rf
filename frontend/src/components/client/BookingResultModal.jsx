import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import { formatDateDisplay } from '../../lib/dates';

export default function BookingResultModal({ open, result, onClose }) {
  if (!result) {
    return null;
  }

  const isSuccess = result.type === 'success';
  const isPendingRequest = Boolean(result.pendingRequest);
  const classItem = result.classItem;

  const title = !isSuccess
    ? 'No se pudo reservar'
    : isPendingRequest
      ? 'Solicitud enviada'
      : 'Reserva confirmada';

  const description = !isSuccess
    ? 'Revisá el detalle e intentá de nuevo.'
    : isPendingRequest
      ? 'El estudio va a revisar tu pedido y te va a contactar.'
      : 'Tu turno quedó registrado correctamente.';

  const headline = !isSuccess
    ? 'Hubo un problema'
    : isPendingRequest
      ? 'Pedido recibido'
      : '¡Listo!';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
    >
      <div className="space-y-5">
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
            isSuccess
              ? isPendingRequest
                ? 'border-amber-100 bg-amber-50/70'
                : 'border-emerald-100 bg-emerald-50/70'
              : 'border-red-100 bg-red-50/70'
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isSuccess
                ? isPendingRequest
                  ? 'bg-amber-100 text-warning'
                  : 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-danger'
            }`}
          >
            <NavIcon name={isSuccess ? 'calendar' : 'close'} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">{headline}</p>
            <p className="mt-1 text-sm text-text-muted">{result.message}</p>
          </div>
        </div>

        {isSuccess && classItem ? (
          <div className="rounded-2xl border border-border bg-surface-muted/40 px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Detalle del turno
            </p>
            <p className="mt-2 text-base font-semibold capitalize text-text">
              {formatDateDisplay(classItem.classDate)}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {classItem.startTime}
              {classItem.endTime ? ` – ${classItem.endTime}` : ''}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            {isSuccess ? (isPendingRequest ? 'Entendido' : 'Perfecto') : 'Entendido'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
