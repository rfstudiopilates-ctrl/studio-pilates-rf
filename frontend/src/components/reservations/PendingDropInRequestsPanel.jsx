import { useMemo, useState } from 'react';
import GuestReservationConfirmModal from './GuestReservationConfirmModal';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import { BOOKING_TYPE_LABELS } from '../../constants/reservations';
import { useReservationsList } from '../../hooks/useReservations';
import { addDaysToDate, formatDateDisplay, getTodayInArgentina } from '../../lib/dates';

export default function PendingDropInRequestsPanel() {
  const today = getTodayInArgentina();
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const params = useMemo(
    () => ({
      from: today,
      to: addDaysToDate(today, 60),
      status: 'pending',
      bookingType: 'drop_in',
      page: 1,
      limit: 50,
    }),
    [today]
  );

  const { data, isLoading, isError, isFetching } = useReservationsList(params);
  const items = data?.items || [];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <NavIcon name="bell" className="h-5 w-5 text-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Solicitudes sin plan</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Clientes que pidieron un turno puntual. Avisá por WhatsApp, cobrá la seña y
              confirmá el lugar.
              {isFetching && !isLoading ? ' · Actualizando' : ''}
            </p>
          </div>
        </div>
      </section>

      {feedback ? (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
          {feedback.message}
        </Alert>
      ) : null}

      {isError ? (
        <Alert variant="error">No se pudieron cargar las solicitudes.</Alert>
      ) : isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-muted">
          Cargando solicitudes...
        </div>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <p className="text-sm font-semibold text-text">No hay solicitudes pendientes</p>
          <p className="mt-1 text-sm text-text-muted">
            Cuando un cliente sin plan pida un turno, va a aparecer acá.
          </p>
        </section>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {items.map((reservation) => (
            <article
              key={reservation.id}
              className="flex w-full max-w-sm flex-col rounded-2xl border border-amber-100 bg-amber-50/40 p-4 sm:w-[calc(50%-0.375rem)] sm:max-w-none lg:w-[calc(33.333%-0.5rem)] xl:w-[calc(25%-0.5625rem)]"
            >
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-base font-semibold text-text">{reservation.clientName}</p>
                <p className="mt-1 text-sm capitalize text-text-muted">
                  {formatDateDisplay(reservation.classDate)} · {reservation.startTime}
                  {reservation.endTime ? ` – ${reservation.endTime}` : ''}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
                  {reservation.clientPhone ? ` · ${reservation.clientPhone}` : ''}
                </p>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setFeedback(null);
                  setSelectedReservation(reservation);
                }}
              >
                Gestionar
              </Button>
            </article>
          ))}
        </div>
      )}

      <GuestReservationConfirmModal
        open={Boolean(selectedReservation)}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onSuccess={(result) => {
          setSelectedReservation(null);

          if (result?.rejected) {
            setFeedback({
              type: 'success',
              message: 'Solicitud rechazada. El cupo quedó libre.',
            });
          } else {
            const planName = result?.clientPlan?.planName || 'plan';
            const planPrice = Number(result?.planPrice ?? result?.clientPlan?.priceSnapshot ?? 0);
            const paid = Number(result?.depositAmount ?? 0);
            const balance = Number(result?.balanceAfter ?? 0);
            const remaining = Math.max(0, Number((planPrice - paid).toFixed(2)));

            setFeedback({
              type: 'success',
              message:
                remaining > 0
                  ? `Turno confirmado. Se asignó "${planName}". Seña ${paid.toLocaleString('es-AR')} · queda ${remaining.toLocaleString('es-AR')} en cuenta (saldo ${balance.toLocaleString('es-AR')}).`
                  : `Turno confirmado. Se asignó "${planName}" y quedó saldado.`,
            });
          }

          window.setTimeout(() => setFeedback(null), 7000);
        }}
      />
    </div>
  );
}
