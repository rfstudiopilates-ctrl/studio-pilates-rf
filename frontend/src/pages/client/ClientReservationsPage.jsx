import { useEffect, useMemo, useRef, useState } from 'react';
import BookingResultModal from '../../components/client/BookingResultModal';
import ClientLayout from '../../components/client/ClientLayout';
import ClientWeekAvailability from '../../components/client/ClientWeekAvailability';
import ConfirmBookingModal from '../../components/client/ConfirmBookingModal';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import NavIcon from '../../components/ui/NavIcon';
import {
  BOOKING_TYPE_LABELS,
  RECURRING_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from '../../constants/reservations';
import { DAY_OF_WEEK_LABELS } from '../../constants/schedules';
import { SCHEDULE_CHANGE_STATUS_LABELS } from '../../constants/scheduleChanges';
import { useClassesAvailability } from '../../hooks/useClasses';
import { useMyActivePlan } from '../../hooks/usePlans';
import {
  useCancelMyReservation,
  useCreateMyReservation,
  useMyRecoveryCredits,
  useMyRecurring,
  useMyReservations,
} from '../../hooks/useReservations';
import {
  useCancelScheduleChange,
  useCreateScheduleChange,
  useMyScheduleChanges,
} from '../../hooks/useScheduleChanges';
import {
  addDaysToDate,
  formatDateDisplay,
  getTodayInArgentina,
  getWeekStartDate,
  isClassPast,
  normalizeDateInput,
} from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

function buildGroupedAvailability(items = [], { from, to } = {}) {
  const grouped = {};

  for (const classItem of items) {
    const dateKey = normalizeDateInput(classItem.classDate);
    if (!dateKey) continue;
    if (from && dateKey < from) continue;
    if (to && dateKey > to) continue;
    if (isClassPast(dateKey, classItem.startTime)) continue;
    if (classItem.isFull || Number(classItem.spotsAvailable || 0) <= 0) continue;

    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push({
      ...classItem,
      classDate: dateKey,
    });
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }

  return grouped;
}

function getStatusBadgeClass(status) {
  if (status === 'cancelled') return 'bg-red-50 text-danger border-red-100';
  if (status === 'pending') return 'bg-amber-50 text-warning border-amber-100';
  return 'bg-emerald-50 text-emerald-800 border-emerald-100';
}

function PendingChangesSection() {
  const { data, isLoading } = useMyScheduleChanges({ limit: 20 });
  const cancelChange = useCancelScheduleChange();
  const items = (data?.items || []).filter((item) => item.status === 'pending');

  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="text-sm font-semibold text-text">Cambios pendientes</h2>
      <p className="mt-0.5 text-xs text-text-muted">
        El estudio tiene que aprobar estos cambios de horario.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-amber-100 bg-white px-3.5 py-3 text-sm"
          >
            <p className="font-medium text-text">
              {SCHEDULE_CHANGE_STATUS_LABELS[request.status]}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {formatDateDisplay(request.fromClass?.classDate)} {request.fromClass?.startTime} →{' '}
              {formatDateDisplay(request.toClass?.classDate)} {request.toClass?.startTime}
            </p>
            <Button
              variant="ghost"
              className="mt-2 h-8 px-0 text-xs text-danger"
              onClick={() => {
                if (window.confirm('¿Cancelar esta solicitud de cambio?')) {
                  cancelChange.mutate(request.id);
                }
              }}
              isLoading={cancelChange.isPending}
            >
              Cancelar solicitud
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function FixedSchedulesSection({ onChangeHint }) {
  const { data: recurring = [], isLoading } = useMyRecurring();
  const activeItems = recurring.filter(
    (item) => item.status === 'active' || item.status === 'paused'
  );

  if (isLoading || activeItems.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
          <NavIcon name="schedule" className="h-5 w-5 text-text" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text">Mis horarios fijos</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Estas clases se reservan solas cada semana. Si necesitás mover una fecha puntual,
            usá “Cambiar horario” en esa reserva.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-surface-muted/30 px-4 py-3"
          >
            <p className="text-sm font-semibold text-text">
              {DAY_OF_WEEK_LABELS[item.dayOfWeek]} · {item.startTime}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {RECURRING_STATUS_LABELS[item.status] || item.status}
            </p>
          </div>
        ))}
      </div>

      {typeof onChangeHint === 'function' ? (
        <button
          type="button"
          onClick={onChangeHint}
          className="mt-4 text-sm font-medium text-text underline-offset-2 hover:underline"
        >
          Ver mis próximas clases
        </button>
      ) : null}
    </section>
  );
}

export default function ClientReservationsPage() {
  const today = getTodayInArgentina();
  const currentWeekStart = getWeekStartDate(today);
  const weekListRef = useRef(null);
  const myReservationsListRef = useRef(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [changingReservation, setChangingReservation] = useState(null);
  const [selectedCreditId, setSelectedCreditId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [submittingClassId, setSubmittingClassId] = useState(null);
  const [cancellingReservationId, setCancellingReservationId] = useState(null);

  const weekStart = addDaysToDate(currentWeekStart, weekOffset * 7);
  const weekEnd = addDaysToDate(weekStart, 6);

  const {
    data: availability,
    isLoading: availabilityLoading,
    isFetching,
    isPlaceholderData,
  } = useClassesAvailability({
    from: weekStart,
    to: weekEnd,
  });

  const { data: reservationsData, isLoading: reservationsLoading } = useMyReservations({
    from: addDaysToDate(today, -7),
    to: addDaysToDate(today, 21),
    limit: 50,
  });

  const { data: recoveryCredits = [] } = useMyRecoveryCredits();
  const { data: activePlan } = useMyActivePlan();

  const createReservation = useCreateMyReservation();
  const cancelReservation = useCancelMyReservation();
  const createChange = useCreateScheduleChange();

  const myReservations = useMemo(
    () =>
      (reservationsData?.items || []).filter((item) => {
        if (!['pending', 'confirmed'].includes(item.status)) return false;
        const dateKey = normalizeDateInput(item.classDate);
        return dateKey && dateKey >= today;
      }),
    [reservationsData, today]
  );

  const reservedClassIds = useMemo(
    () => new Set(myReservations.map((item) => item.generatedClassId)),
    [myReservations]
  );

  const reservedDates = useMemo(() => {
    const dates = new Map();

    for (const reservation of myReservations) {
      const dateKey = normalizeDateInput(reservation.classDate);
      if (!dateKey || dates.has(dateKey)) continue;
      dates.set(dateKey, reservation);
    }

    return dates;
  }, [myReservations]);

  const grouped = useMemo(
    () =>
      buildGroupedAvailability(availability?.items || [], {
        from: weekStart,
        to: weekEnd,
      }),
    [availability, weekStart, weekEnd]
  );

  function handleWeekOffsetChange(nextOffset) {
    setWeekOffset(nextOffset === 1 ? 1 : 0);
  }

  const canBookWithPlan =
    Boolean(selectedCreditId) || Boolean(activePlan?.availability?.canBook);
  const canRequestWithoutPlan = !activePlan && recoveryCredits.length === 0;
  const canBook = canBookWithPlan || canRequestWithoutPlan;

  const hasReservations = myReservations.length > 0;
  const calendarMode = changingReservation ? 'change' : 'book';
  const canStillBookMore =
    Boolean(activePlan?.availability?.canBook) ||
    recoveryCredits.length > 0 ||
    (canRequestWithoutPlan && !hasReservations);
  // Si ya tiene reservas y no le quedan cupos (ni créditos), ocultamos el alta.
  // En cambio de horario siempre se muestra. Sin plan puede pedir 1 turno a la vez.
  const showBookingSection =
    Boolean(changingReservation) || canStillBookMore || !hasReservations;

  useEffect(() => {
    if (!changingReservation) return;
    weekListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [changingReservation]);

  function clearFeedbackLater() {
    window.setTimeout(() => setFeedback(null), 5000);
  }

  async function handleBook(classItem) {
    const classDate = normalizeDateInput(classItem.classDate);
    const existingSameDay = classDate ? reservedDates.get(classDate) : null;

    if (existingSameDay && existingSameDay.generatedClassId !== classItem.id) {
      setBookingResult({
        type: 'error',
        message:
          'Ya tenés una clase reservada para ese día. Cancelala primero si querés cambiar de horario.',
        classItem: null,
      });
      return;
    }

    setFeedback(null);
    setSubmittingClassId(classItem.id);

    try {
      const reservation = await createReservation.mutateAsync({
        generatedClassId: classItem.id,
        recoveryCreditId: selectedCreditId ? Number(selectedCreditId) : undefined,
      });
      setSelectedCreditId('');
      const isPendingRequest = reservation?.status === 'pending';
      setBookingResult({
        type: 'success',
        pendingRequest: isPendingRequest,
        message: isPendingRequest
          ? 'Tu solicitud quedó enviada. El estudio te va a contactar para coordinar la seña y confirmar el turno.'
          : 'Tu clase quedó reservada. La vas a ver en “Mis clases”.',
        classItem: {
          classDate,
          startTime: classItem.startTime,
          endTime: classItem.endTime,
        },
      });
    } catch (error) {
      setBookingResult({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo completar la reserva.'),
        classItem: null,
      });
    } finally {
      setSubmittingClassId(null);
    }
  }

  async function handleChangeToClass(classItem) {
    if (!changingReservation) return;

    setFeedback(null);
    setSubmittingClassId(classItem.id);

    try {
      await createChange.mutateAsync({
        reservationId: changingReservation.id,
        toGeneratedClassId: classItem.id,
      });
      setFeedback({
        type: 'success',
        message: 'Solicitud de cambio enviada. El estudio la revisará pronto.',
      });
      setChangingReservation(null);
      clearFeedbackLater();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo enviar el cambio de horario.'),
      });
    } finally {
      setSubmittingClassId(null);
    }
  }

  async function handleCancel(reservation) {
    if (
      !window.confirm(
        `¿Cancelar la clase del ${formatDateDisplay(reservation.classDate)} a las ${reservation.startTime}?`
      )
    ) {
      return;
    }

    setFeedback(null);
    setCancellingReservationId(reservation.id);

    try {
      const result = await cancelReservation.mutateAsync({ id: reservation.id });
      const bankMessage = result.returnedToPlan
        ? ' La clase vuelve a tu cupo del plan para usarla en otra fecha.'
        : '';
      setFeedback({
        type: 'success',
        message: `Reserva cancelada.${bankMessage}`,
      });
      if (changingReservation?.id === reservation.id) {
        setChangingReservation(null);
      }
      clearFeedbackLater();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo cancelar la reserva.'),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setCancellingReservationId(null);
    }
  }

  function startChange(reservation) {
    const date = normalizeDateInput(reservation.classDate) || today;
    const reservationWeekStart = getWeekStartDate(date);
    const nextWeekStart = addDaysToDate(currentWeekStart, 7);

    let nextOffset = 0;
    if (reservationWeekStart === nextWeekStart) {
      nextOffset = 1;
    } else if (reservationWeekStart > nextWeekStart) {
      nextOffset = 1;
      setFeedback({
        type: 'error',
        message:
          'Solo podés cambiar a un horario de esta semana o la próxima. Elegí una fecha cercana.',
      });
    }

    setChangingReservation(reservation);
    setWeekOffset(nextOffset);
    setFeedback({
      type: 'success',
      message: 'Elegí el nuevo horario disponible en la lista de la semana.',
    });
  }

  function cancelChangeMode() {
    setChangingReservation(null);
    setFeedback(null);
  }

  function handleSelectClass(classItem) {
    setPendingSlot(classItem);
  }

  function handleClosePendingSlot() {
    if (submittingClassId) return;
    setPendingSlot(null);
  }

  async function handleConfirmPendingSlot() {
    if (!pendingSlot) return;

    const classItem = pendingSlot;

    if (calendarMode === 'change') {
      await handleChangeToClass(classItem);
      setPendingSlot(null);
      return;
    }

    await handleBook(classItem);
    setPendingSlot(null);
  }

  const planHint = activePlan
    ? `${activePlan.availability?.weeklyRemaining ?? 0} libres esta semana · ${activePlan.availability?.monthlyRemaining ?? 0} en tu abono${
        Number(activePlan.availability?.catchUpSlots || 0) > 0
          ? ` · ${activePlan.availability.catchUpSlots} de recuperación`
          : ''
      }`
    : canRequestWithoutPlan
      ? 'Sin plan activo: pedí un turno y el estudio lo confirma con la seña.'
      : 'Necesitás un plan activo o un crédito de recuperación.';

  return (
    <ClientLayout title="Reservas" subtitle="Tus clases y disponibilidad">
      <div className="mx-auto max-w-3xl space-y-5">
        {feedback ? (
          <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
            {feedback.message}
          </Alert>
        ) : null}

        {changingReservation ? (
          <section className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Cambiando de horario</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Desde {formatDateDisplay(changingReservation.classDate)} ·{' '}
                  {changingReservation.startTime}
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={cancelChangeMode}
              >
                Cancelar
              </Button>
            </div>
          </section>
        ) : null}

        <FixedSchedulesSection
          onChangeHint={() => {
            myReservationsListRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        />

        {reservationsLoading ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-muted">
            Cargando tus reservas...
          </div>
        ) : hasReservations ? (
          <section
            ref={myReservationsListRef}
            className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                <NavIcon name="calendar" className="h-5 w-5 text-text" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">Mis clases</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  {myReservations.length} reserva{myReservations.length === 1 ? '' : 's'} activa
                  {myReservations.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {myReservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className={`rounded-2xl border p-4 ${
                    changingReservation?.id === reservation.id
                      ? 'border-brand-300 bg-brand-50/50'
                      : 'border-border bg-surface-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold capitalize text-text">
                        {formatDateDisplay(reservation.classDate)}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {reservation.startTime} – {reservation.endTime}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(reservation.status)}`}
                    >
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </span>
                  </div>

                  {reservation.status === 'confirmed' ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => startChange(reservation)}
                      >
                        Cambiar horario
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full text-danger"
                        onClick={() => handleCancel(reservation)}
                        isLoading={cancellingReservationId === reservation.id}
                        disabled={Boolean(cancellingReservationId)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : null}
                  {reservation.status === 'pending' ? (
                    <div className="mt-4 space-y-3">
                      <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-xs text-text">
                        {reservation.bookingType === 'drop_in'
                          ? 'Solicitud enviada. El estudio te va a contactar para la seña y la confirmación.'
                          : 'Esta reserva está pendiente de confirmación del estudio.'}
                      </p>
                      <Button
                        variant="ghost"
                        className="w-full text-danger"
                        onClick={() => handleCancel(reservation)}
                        isLoading={cancellingReservationId === reservation.id}
                        disabled={Boolean(cancellingReservationId)}
                      >
                        Cancelar solicitud
                      </Button>
                    </div>
                  ) : null}
                  {reservation.bookingType === 'recurring' ? (
                    <p className="mt-3 text-xs text-text-muted">
                      Viene de tu horario fijo. El cambio aplica solo a esta fecha.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>

            {!changingReservation && showBookingSection ? (
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => {
                  weekListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {canStillBookMore ? 'Reservar otra clase' : 'Ver horarios disponibles'}
              </Button>
            ) : null}
          </section>
        ) : null}

        <PendingChangesSection />

        {showBookingSection ? (
          <div ref={weekListRef}>
            {!hasReservations && !changingReservation ? (
              <section className="mb-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-center">
                <p className="text-sm font-semibold text-text">
                  {canRequestWithoutPlan
                    ? 'Pedí tu primer turno'
                    : 'Todavía no tenés clases reservadas'}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {canRequestWithoutPlan
                    ? 'Elegí un horario disponible. El estudio confirma el lugar cuando se paga la seña.'
                    : 'Elegí un horario disponible de esta semana o la próxima.'}
                </p>
              </section>
            ) : null}

            <ClientWeekAvailability
              weekStart={weekStart}
              weekOffset={weekOffset}
              onWeekOffsetChange={handleWeekOffsetChange}
              grouped={grouped}
              reservedClassIds={reservedClassIds}
              reservedDates={reservedDates}
              mode={calendarMode}
              excludeClassId={changingReservation?.generatedClassId || null}
              canBook={canBook}
              requestMode={canRequestWithoutPlan && !changingReservation}
              submittingClassId={submittingClassId}
              planHint={planHint}
              recoveryCredits={recoveryCredits}
              selectedCreditId={selectedCreditId}
              onCreditChange={setSelectedCreditId}
              onSelectClass={handleSelectClass}
              isLoading={availabilityLoading && !availability}
              isRefreshing={isFetching && (isPlaceholderData || Boolean(availability))}
            />
          </div>
        ) : hasReservations ? (
          <section className="rounded-2xl border border-border bg-surface-muted/30 p-4 text-center sm:p-5">
            <p className="text-sm font-semibold text-text">Tus turnos ya están reservados</p>
            <p className="mt-1 text-xs text-text-muted">
              Cuando tengas cupo disponible o canceles una clase, vas a poder elegir un nuevo
              horario acá.
            </p>
          </section>
        ) : null}
      </div>

      <ConfirmBookingModal
        open={Boolean(pendingSlot)}
        classItem={pendingSlot}
        mode={calendarMode}
        requestMode={canRequestWithoutPlan && !changingReservation}
        isSubmitting={Boolean(submittingClassId)}
        fromReservation={changingReservation}
        onClose={handleClosePendingSlot}
        onConfirm={handleConfirmPendingSlot}
      />

      <BookingResultModal
        open={Boolean(bookingResult)}
        result={bookingResult}
        onClose={() => setBookingResult(null)}
      />
    </ClientLayout>
  );
}
