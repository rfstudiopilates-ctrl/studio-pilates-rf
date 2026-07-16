import ClassReservationsPanel from '../reservations/ClassReservationsPanel';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { CLASS_STATUS_LABELS } from '../../constants/schedules';
import { formatDateDisplay } from '../../lib/dates';

function getStatusBadgeClass(status) {
  if (status === 'cancelled') {
    return 'bg-red-50 text-danger border-red-100';
  }
  if (status === 'completed') {
    return 'bg-surface-muted text-text-muted border-border';
  }
  return 'bg-emerald-50 text-emerald-800 border-emerald-100';
}

export default function ClassDetailModal({
  open,
  classItem,
  onClose,
  onCancelClass,
  isCancelling,
}) {
  if (!classItem) {
    return null;
  }

  const canCancel =
    classItem.status === 'scheduled' && Number(classItem.bookedCount || 0) === 0;
  const used = Number(classItem.bookedCount || 0);
  const total = Number(classItem.capacity || 0);
  const rate = total > 0 ? Math.round((used / total) * 100) : 0;
  const spotsLabel = classItem.isFull
    ? 'Clase completa'
    : `${classItem.spotsAvailable} lugar${Number(classItem.spotsAvailable) === 1 ? '' : 'es'} libre${Number(classItem.spotsAvailable) === 1 ? '' : 's'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${classItem.startTime} – ${classItem.endTime}`}
      description={`${formatDateDisplay(classItem.classDate)} · Detalle de la clase`}
      size="2xl"
      bodyScroll={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">{spotsLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {canCancel ? (
              <Button
                variant="ghost"
                className="text-danger"
                onClick={() => onCancelClass?.(classItem)}
                isLoading={isCancelling}
              >
                Cancelar clase
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-border bg-surface-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(classItem.status)}`}
              >
                {CLASS_STATUS_LABELS[classItem.status]}
              </span>
              {classItem.isFull ? (
                <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Completa
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-text sm:text-2xl">
              {classItem.startTime}
              <span className="mx-1.5 text-base font-medium text-text-muted">–</span>
              {classItem.endTime}
            </p>
            <p className="mt-0.5 capitalize text-sm text-text-muted">
              {formatDateDisplay(classItem.classDate)}
            </p>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-border/70 bg-white px-3.5 py-3 sm:w-52">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Ocupación
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                  {used}
                  <span className="text-sm font-medium text-text-muted"> / {total}</span>
                </p>
              </div>
              <p className="text-xs font-medium tabular-nums text-text-muted">{rate}%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={`h-full rounded-full ${
                  rate >= 100 ? 'bg-amber-500' : rate >= 70 ? 'bg-orange-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, rate)}%` }}
              />
            </div>
          </div>
        </div>

        <ClassReservationsPanel classItem={classItem} onClose={onClose} embedded />
      </div>
    </Modal>
  );
}
