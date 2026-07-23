import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClientSearchSelect from '../clients/ClientSearchSelect';
import WhatsAppReminderButton from '../notifications/WhatsAppReminderButton';
import GuestReservationConfirmModal from './GuestReservationConfirmModal';
import ReassignClassPicker from './ReassignClassPicker';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import {
  BOOKING_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from '../../constants/reservations';
import { useAdminReassignReservation } from '../../hooks/useScheduleChanges';
import { getErrorMessage } from '../../lib/formErrors';
import {
  useCancelReservation,
  useClassReservations,
  useConfirmReservation,
  useCreateReservation,
} from '../../hooks/useReservations';
import { formatDateDisplay } from '../../lib/dates';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function NewReservationForm({
  selectedClient,
  setSelectedClient,
  status,
  setStatus,
  onCreate,
  isCreating,
  isFull,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? 'rounded-2xl border border-border bg-surface-muted/50 p-3'
          : 'rounded-2xl border border-border bg-surface-muted/40 p-4'
      }
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">Nueva reserva</h3>
        {isFull ? <p className="text-xs text-warning">Clase completa</p> : null}
      </div>

      <div
        className={
          compact
            ? 'grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto] sm:items-end'
            : 'space-y-3'
        }
      >
        <ClientSearchSelect
          label="Cliente"
          placeholder="Buscar alumno..."
          value={selectedClient}
          onChange={setSelectedClient}
          status="active"
          disabled={isFull}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="confirmed">Confirmada</option>
          <option value="pending">Pendiente</option>
        </Select>
        <Button
          className={compact ? 'w-full sm:h-11 sm:w-auto sm:min-w-[8.5rem]' : 'w-full'}
          onClick={onCreate}
          isLoading={isCreating}
          disabled={!selectedClient?.id || isFull}
        >
          Crear reserva
        </Button>
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  classItem,
  reassignFor,
  setReassignFor,
  reassignClassId,
  setReassignClassId,
  onConfirm,
  onCancel,
  onReassign,
  onReminderError,
  confirmPending,
  cancelPending,
  reassignPending,
}) {
  return (
    <article className="rounded-2xl border border-border/80 bg-white p-3.5 shadow-[0_4px_16px_rgba(26,26,26,0.03)] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text">
            {getInitials(reservation.clientName) || '—'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/admin/clientes/${reservation.clientId}`}
                className="truncate font-medium text-text hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {reservation.clientName}
              </Link>
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  RESERVATION_STATUS_STYLES[reservation.status] ||
                  'border-border bg-surface-muted text-text-muted'
                }`}
              >
                {RESERVATION_STATUS_LABELS[reservation.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
              {reservation.clientPhone ? ` · ${reservation.clientPhone}` : ' · Sin teléfono'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {['pending', 'confirmed'].includes(reservation.status) ? (
            <WhatsAppReminderButton
              compact
              clientName={reservation.clientName}
              clientPhone={reservation.clientPhone}
              classDate={classItem.classDate}
              startTime={classItem.startTime}
              onError={onReminderError}
            />
          ) : null}
          {reservation.status === 'pending' ? (
            <Button
              className="h-8 px-3 text-xs"
              onClick={() => onConfirm(reservation)}
              isLoading={reservation.bookingType !== 'drop_in' && confirmPending}
            >
              {reservation.bookingType === 'drop_in' ? 'Gestionar' : 'Confirmar'}
            </Button>
          ) : null}
          {reservation.status === 'confirmed' ? (
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => {
                const opening = reassignFor !== reservation.id;
                setReassignFor(opening ? reservation.id : null);
                if (opening) {
                  setReassignClassId('');
                }
              }}
            >
              {reassignFor === reservation.id ? 'Cerrar' : 'Reasignar'}
            </Button>
          ) : null}
          {['pending', 'confirmed'].includes(reservation.status) ? (
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs text-danger"
              onClick={() => onCancel(reservation.id)}
              isLoading={cancelPending}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      {reassignFor === reservation.id ? (
        <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
          <ReassignClassPicker
            excludeClassId={classItem.id}
            value={reassignClassId}
            onChange={setReassignClassId}
            disabled={reassignPending}
            label="Reasignar a"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="h-11"
              onClick={() => {
                setReassignFor(null);
                setReassignClassId('');
              }}
              disabled={reassignPending}
            >
              Cancelar
            </Button>
            <Button
              className="h-11"
              onClick={() => onReassign(reservation.id)}
              isLoading={reassignPending}
              disabled={!reassignClassId}
            >
              Confirmar reasignación
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function ClassReservationsPanel({
  classItem,
  onClose,
  embedded = false,
  onClassOccupancyChange,
}) {
  const { data, isLoading } = useClassReservations(classItem?.id);
  const createReservation = useCreateReservation();
  const confirmReservation = useConfirmReservation();
  const cancelReservation = useCancelReservation();
  const reassignReservation = useAdminReassignReservation();

  const [selectedClient, setSelectedClient] = useState(null);
  const [status, setStatus] = useState('confirmed');
  const [feedback, setFeedback] = useState(null);
  const [reassignFor, setReassignFor] = useState(null);
  const [reassignClassId, setReassignClassId] = useState('');
  const [guestReservation, setGuestReservation] = useState(null);

  const reservations = data?.reservations || [];
  const syncedClass = data?.classItem || null;

  const activeReservations = useMemo(
    () => reservations.filter((item) => ['pending', 'confirmed'].includes(item.status)),
    [reservations]
  );

  const liveClassItem = useMemo(() => {
    const capacity = Number(syncedClass?.capacity ?? classItem?.capacity ?? 0);
    const bookedCount = data
      ? activeReservations.length
      : Number(syncedClass?.bookedCount ?? classItem?.bookedCount ?? 0);
    const spotsAvailable = Math.max(0, capacity - bookedCount);

    return {
      ...(syncedClass || classItem),
      capacity,
      bookedCount,
      spotsAvailable,
      isFull: capacity > 0 ? bookedCount >= capacity : Boolean(classItem?.isFull),
    };
  }, [data, activeReservations.length, syncedClass, classItem]);

  useEffect(() => {
    if (!onClassOccupancyChange || !classItem?.id) return;

    onClassOccupancyChange({
      ...liveClassItem,
      id: classItem.id,
    });
  }, [
    onClassOccupancyChange,
    classItem?.id,
    liveClassItem.bookedCount,
    liveClassItem.spotsAvailable,
    liveClassItem.isFull,
    liveClassItem.capacity,
    liveClassItem.status,
  ]);

  async function handleCreate() {
    if (!selectedClient?.id) return;
    setFeedback(null);

    try {
      await createReservation.mutateAsync({
        clientId: Number(selectedClient.id),
        generatedClassId: classItem.id,
        status,
      });
      setFeedback({ type: 'success', message: 'Reserva creada correctamente.' });
      setSelectedClient(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo crear la reserva.'),
      });
    }
  }

  async function handleConfirm(reservation) {
    if (reservation.bookingType === 'drop_in') {
      setGuestReservation(reservation);
      return;
    }

    setFeedback(null);
    try {
      await confirmReservation.mutateAsync(reservation.id);
      setFeedback({ type: 'success', message: 'Reserva confirmada.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo confirmar la reserva.'),
      });
    }
  }

  async function handleCancel(reservationId) {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    setFeedback(null);

    try {
      await cancelReservation.mutateAsync({ id: reservationId });
      setFeedback({ type: 'success', message: 'Reserva cancelada.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo cancelar la reserva.'),
      });
    }
  }

  async function handleReassign(reservationId) {
    if (!reassignClassId) return;
    setFeedback(null);

    try {
      await reassignReservation.mutateAsync({
        reservationId,
        toGeneratedClassId: Number(reassignClassId),
      });
      setFeedback({ type: 'success', message: 'Reserva reasignada correctamente.' });
      setReassignFor(null);
      setReassignClassId('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo reasignar la reserva.'),
      });
    }
  }

  if (!classItem) {
    return null;
  }

  const reservationList = (
    <>
      {isLoading ? (
        <p className="text-sm text-text-muted">Cargando alumnos...</p>
      ) : reservations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center">
          <p className="text-sm font-medium text-text">Sin alumnos en esta clase</p>
          <p className="mt-1 text-sm text-text-muted">
            Agregá una reserva con el formulario de arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 pb-1">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              classItem={classItem}
              reassignFor={reassignFor}
              setReassignFor={setReassignFor}
              reassignClassId={reassignClassId}
              setReassignClassId={setReassignClassId}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onReassign={handleReassign}
              onReminderError={(message) => setFeedback({ type: 'error', message })}
              confirmPending={confirmReservation.isPending}
              cancelPending={cancelReservation.isPending}
              reassignPending={reassignReservation.isPending}
            />
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <section className="flex shrink-0 flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="flex shrink-0 items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Alumnos</h2>
            <p className="text-sm text-text-muted">
              {activeReservations.length} activo
              {activeReservations.length === 1 ? '' : 's'} · {reservations.length} en total
            </p>
          </div>
        </div>

        {feedback ? (
          <div className="shrink-0">
            <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
              {feedback.message}
            </Alert>
          </div>
        ) : null}

        <div className="shrink-0">
          <NewReservationForm
            compact
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            status={status}
            setStatus={setStatus}
            onCreate={handleCreate}
            isCreating={createReservation.isPending}
            isFull={liveClassItem.isFull}
          />
        </div>

        <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {reservationList}
        </div>

        <GuestReservationConfirmModal
          open={Boolean(guestReservation)}
          reservation={guestReservation}
          onClose={() => setGuestReservation(null)}
          onSuccess={(result) => {
            setGuestReservation(null);
            setFeedback({
              type: 'success',
              message: result?.rejected
                ? 'Solicitud rechazada.'
                : result?.clientPlan
                  ? `Turno confirmado. Plan "${result.clientPlan.planName}" asignado.`
                  : 'Seña registrada y turno confirmado.',
            });
          }}
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Reservas de la clase</h2>
          <p className="text-sm capitalize text-text-muted">
            {formatDateDisplay(classItem.classDate)} · {classItem.startTime} –{' '}
            {classItem.endTime}
          </p>
          <p className="text-sm text-text-muted">
            Cupos: {liveClassItem.bookedCount}/{liveClassItem.capacity}
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Cerrar
        </Button>
      </div>

      {feedback ? (
        <div className="mt-4">
          <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
            {feedback.message}
          </Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">{reservationList}</div>
        <NewReservationForm
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          status={status}
          setStatus={setStatus}
          onCreate={handleCreate}
          isCreating={createReservation.isPending}
          isFull={liveClassItem.isFull}
        />
      </div>

      <GuestReservationConfirmModal
        open={Boolean(guestReservation)}
        reservation={guestReservation}
        onClose={() => setGuestReservation(null)}
        onSuccess={(result) => {
          setGuestReservation(null);
          setFeedback({
            type: 'success',
            message: result?.rejected
              ? 'Solicitud rechazada.'
              : result?.clientPlan
                ? `Turno confirmado. Plan "${result.clientPlan.planName}" asignado.`
                : 'Seña registrada y turno confirmado.',
          });
        }}
      />
    </section>
  );
}
