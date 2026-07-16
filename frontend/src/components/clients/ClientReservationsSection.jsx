import { useMemo, useState } from 'react';
import GuestReservationConfirmModal from '../reservations/GuestReservationConfirmModal';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import {
  BOOKING_TYPE_LABELS,
  RECURRING_STATUS_LABELS,
  RECURRING_STATUS_STYLES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from '../../constants/reservations';
import {
  getFixedScheduleSlotLimit,
  planAllowsFixedSchedules,
} from '../../constants/plans';
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '../../constants/schedules';
import { useClientPlans } from '../../hooks/usePlans';
import {
  useCancelReservation,
  useClientRecurring,
  useClientReservations,
  useConfirmReservation,
  useCreateRecurring,
  useUpdateRecurring,
} from '../../hooks/useReservations';
import { useWeeklySchedule } from '../../hooks/useSchedules';
import { addDaysToDate, formatDateDisplay, getTodayInArgentina, normalizeDateInput } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

function StatusBadge({ status, labels, styles }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] || 'border-border bg-white text-text-muted'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export function ClientReservationsSection({ clientId }) {
  const today = getTodayInArgentina();
  const { data: reservationsData, isLoading } = useClientReservations(clientId, {
    from: addDaysToDate(today, -14),
    to: addDaysToDate(today, 90),
    limit: 80,
  });
  const { data: recurring = [], isLoading: isLoadingRecurring } = useClientRecurring(clientId);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useWeeklySchedule();
  const { data: plansData, isLoading: isLoadingPlan } = useClientPlans(clientId, {
    page: 1,
    limit: 1,
  });

  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const confirmReservation = useConfirmReservation();
  const cancelReservation = useCancelReservation();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [guestReservation, setGuestReservation] = useState(null);

  const activePlan = plansData?.activePlan;
  const allowsFixedSchedules = planAllowsFixedSchedules(activePlan);
  const slotLimit = getFixedScheduleSlotLimit(activePlan);
  const reservations = reservationsData?.items || [];
  const slots = scheduleData?.slots || [];

  const activeReservations = useMemo(
    () =>
      reservations.filter((item) => {
        if (!['pending', 'confirmed'].includes(item.status)) return false;
        const dateKey = normalizeDateInput(item.classDate);
        return dateKey && dateKey >= today;
      }),
    [reservations, today]
  );

  const occupyingRecurring = useMemo(
    () => recurring.filter((item) => item.status === 'active' || item.status === 'paused'),
    [recurring]
  );

  const assignedTemplateIds = useMemo(
    () => new Set(occupyingRecurring.map((item) => String(item.scheduleTemplateId))),
    [occupyingRecurring]
  );

  const assignedDays = useMemo(
    () => new Set(occupyingRecurring.map((item) => Number(item.dayOfWeek))),
    [occupyingRecurring]
  );

  const slotsByDay = useMemo(() => {
    const grouped = {};
    for (const day of DAY_OF_WEEK_ORDER) {
      grouped[day] = [];
    }
    for (const slot of slots) {
      if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
      grouped[slot.dayOfWeek].push(slot);
    }
    return grouped;
  }, [slots]);

  const remainingSlots = Math.max(0, slotLimit - occupyingRecurring.length);
  const canAddMore = allowsFixedSchedules && remainingSlots > 0;

  async function handleCreateRecurring() {
    if (!selectedTemplateId || !canAddMore) return;
    setFeedback(null);

    try {
      const result = await createRecurring.mutateAsync({
        clientId: Number(clientId),
        scheduleTemplateId: Number(selectedTemplateId),
      });

      const created = result?.processing?.created ?? 0;
      const errors = result?.processing?.errors ?? 0;
      const firstError = result?.processing?.errorDetails?.[0]?.message;

      setSelectedTemplateId('');
      setFeedback({
        type: created > 0 ? 'success' : 'error',
        message:
          created > 0
            ? errors > 0
              ? `Horario fijo asignado. Se reservaron ${created} clases de ese turno. ${errors} no se pudieron crear${firstError ? `: ${firstError}` : '.'}`
              : `Horario fijo asignado. Se reservaron ${created} clases de ese turno en las próximas semanas.`
            : firstError ||
              'No se pudieron generar las reservas del horario fijo. Revisá cupos del plan y del turno.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo asignar el horario fijo.'),
      });
    }
  }

  async function handleRecurringStatus(id, status) {
    setFeedback(null);
    try {
      const result = await updateRecurring.mutateAsync({ id, payload: { status } });
      const processing = result?.processing;
      const created = Number(processing?.created || 0);

      if (status === 'active') {
        setFeedback({
          type: created > 0 ? 'success' : 'error',
          message:
            created > 0
              ? `Horario fijo reanudado. Se volvieron a reservar ${created} clase${created === 1 ? '' : 's'}.`
              : 'No se pudo reanudar el horario fijo.',
        });
        return;
      }

      const labels = {
        paused: 'Horario fijo pausado. Se liberaron las reservas futuras de ese turno.',
        cancelled: 'Horario fijo cancelado. Se liberaron las reservas futuras.',
      };
      setFeedback({
        type: 'success',
        message: labels[status] || 'Horario fijo actualizado.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo actualizar el horario fijo.'),
      });
    }
  }

  async function handleConfirm(reservation) {
    if (reservation.bookingType === 'drop_in') {
      setGuestReservation(reservation);
      return;
    }

    try {
      await confirmReservation.mutateAsync(reservation.id);
      setFeedback({ type: 'success', message: 'Reserva confirmada.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo confirmar.'),
      });
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('¿Cancelar esta reserva?')) return;

    try {
      await cancelReservation.mutateAsync({ id });
      setFeedback({ type: 'success', message: 'Reserva cancelada.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo cancelar.'),
      });
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
          {feedback.message}
        </Alert>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Reservas del cliente</h2>
            <p className="mt-1 text-sm text-text-muted">
              Próximas reservas, incluyendo las generadas por horarios fijos.
            </p>
          </div>
          {!isLoading ? (
            <span className="text-sm text-text-muted">
              {activeReservations.length} activa{activeReservations.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-text-muted">Cargando reservas...</p>
        ) : activeReservations.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-5">
            <p className="text-sm font-semibold text-text">Sin reservas activas</p>
            <p className="mt-1 text-sm text-text-muted">
              Cuando se asignen horarios fijos o se reserve una clase, aparecerán acá.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex flex-col rounded-2xl border border-border/70 bg-surface-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize text-text">
                      {formatDateDisplay(reservation.classDate)}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {reservation.startTime} – {reservation.endTime}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
                    </p>
                  </div>
                  <StatusBadge
                    status={reservation.status}
                    labels={RESERVATION_STATUS_LABELS}
                    styles={RESERVATION_STATUS_STYLES}
                  />
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {reservation.status === 'pending' ? (
                    <Button
                      className="h-9 flex-1 px-3 text-xs"
                      onClick={() => handleConfirm(reservation)}
                    >
                      {reservation.bookingType === 'drop_in' ? 'Gestionar' : 'Confirmar'}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className={`h-9 px-3 text-xs text-danger ${
                      reservation.status === 'pending' ? '' : 'w-full'
                    }`}
                    onClick={() => handleCancel(reservation.id)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isLoadingPlan ? (
        <section className="rounded-2xl border border-border bg-white p-6">
          <p className="text-sm text-text-muted">Verificando plan para horarios fijos...</p>
        </section>
      ) : allowsFixedSchedules ? (
        <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-text">
                <NavIcon name="schedule" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Horarios fijos</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Con el plan <span className="font-medium text-text">{activePlan.planName}</span>{' '}
                  podés asignar hasta {slotLimit} horario{slotLimit === 1 ? '' : 's'} fijo
                  {slotLimit === 1 ? '' : 's'} por semana. El sistema reserva automáticamente
                  esas clases.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm">
              <span className="font-semibold text-text">{occupyingRecurring.length}</span>
              <span className="text-text-muted"> / {slotLimit} asignados</span>
            </div>
          </div>

          {isLoadingRecurring ? (
            <p className="mt-5 text-sm text-text-muted">Cargando horarios fijos...</p>
          ) : occupyingRecurring.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {occupyingRecurring.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-surface-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text">
                        {DAY_OF_WEEK_LABELS[item.dayOfWeek]}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">{item.startTime}</p>
                    </div>
                    <StatusBadge
                      status={item.status}
                      labels={RECURRING_STATUS_LABELS}
                      styles={RECURRING_STATUS_STYLES}
                    />
                  </div>
                    {item.status === 'paused' ? (
                      <p className="mt-3 text-xs text-text-muted">
                        Pausado: las clases futuras de este turno están liberadas. Al reanudar se
                        vuelven a reservar si hay cupo en el horario y en el plan.
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                    {item.status === 'active' ? (
                      <Button
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                        onClick={() => handleRecurringStatus(item.id, 'paused')}
                        isLoading={updateRecurring.isPending}
                      >
                        Pausar
                      </Button>
                    ) : null}
                    {item.status === 'paused' ? (
                      <Button
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                        onClick={() => handleRecurringStatus(item.id, 'active')}
                        isLoading={updateRecurring.isPending}
                      >
                        Reanudar
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-xs text-danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            '¿Cancelar este horario fijo? Se liberarán las reservas futuras vinculadas.'
                          )
                        ) {
                          handleRecurringStatus(item.id, 'cancelled');
                        }
                      }}
                      isLoading={updateRecurring.isPending}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-5">
              <p className="text-sm font-semibold text-text">Todavía no hay horarios fijos</p>
              <p className="mt-1 text-sm text-text-muted">
                Elegí abajo los días y horarios que este cliente va a tener reservados cada
                semana.
              </p>
            </div>
          )}

          {canAddMore ? (
            <div className="mt-6 border-t border-border pt-6">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">Asignar horario fijo</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Te quedan {remainingSlots} cupo{remainingSlots === 1 ? '' : 's'} según el
                    plan (máx. 1 fijo por día). Al confirmar, se reservan todas las clases de
                    ese turno mientras dure el plan.
                  </p>
                </div>
                <Button
                  onClick={handleCreateRecurring}
                  isLoading={createRecurring.isPending}
                  disabled={!selectedTemplateId}
                  className="w-full sm:w-auto"
                >
                  Confirmar horario
                </Button>
              </div>

              {isLoadingSchedule ? (
                <p className="text-sm text-text-muted">Cargando grilla de horarios...</p>
              ) : slots.length === 0 ? (
                <Alert variant="info">
                  No hay horarios cargados en el estudio. Definilos en Clases → Horarios.
                </Alert>
              ) : (
                <div className="space-y-4">
                  {DAY_OF_WEEK_ORDER.map((day) => {
                    const daySlots = (slotsByDay[day] || []).filter((slot) => {
                      const isAssigned = assignedTemplateIds.has(String(slot.id));
                      if (isAssigned) {
                        return false;
                      }
                      if (assignedDays.has(Number(day))) {
                        return false;
                      }
                      return Number(slot.fixedRemaining ?? 0) > 0;
                    });

                    if (daySlots.length === 0) return null;

                    return (
                      <div key={day}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                          {DAY_OF_WEEK_LABELS[day]}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {daySlots.map((slot) => {
                            const isSelected = String(selectedTemplateId) === String(slot.id);
                            const remaining = Number(slot.fixedRemaining ?? 0);
                            const capacity = Number(slot.capacity ?? 0);
                            const occupiedNames = (slot.fixedClients || []).slice(0, 2);
                            const occupiedHint =
                              occupiedNames.length > 0
                                ? ` · ${occupiedNames.join(', ')}${
                                    (slot.fixedClients || []).length > 2 ? '…' : ''
                                  }`
                                : '';

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() =>
                                  setSelectedTemplateId(isSelected ? '' : String(slot.id))
                                }
                                className={`rounded-2xl border px-3 py-3 text-left transition ${
                                  isSelected
                                    ? 'border-text bg-surface-muted/70 ring-2 ring-text/10'
                                    : 'border-border bg-white hover:border-text/30 hover:bg-surface-muted/40'
                                }`}
                              >
                                <p className="text-sm font-semibold text-text">{slot.startTime}</p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {remaining} libre{remaining === 1 ? '' : 's'} de {capacity}
                                  {occupiedHint}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {DAY_OF_WEEK_ORDER.every((day) => {
                    const daySlots = (slotsByDay[day] || []).filter((slot) => {
                      if (assignedTemplateIds.has(String(slot.id))) return false;
                      if (assignedDays.has(Number(day))) return false;
                      return Number(slot.fixedRemaining ?? 0) > 0;
                    });
                    return daySlots.length === 0;
                  }) ? (
                    <Alert variant="info">
                      No hay horarios disponibles. Los días con fijo ya asignado no admiten otro
                      turno, y los cupos ocupados por otros clientes tampoco.
                    </Alert>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <Alert variant="info" className="mt-5">
              Ya tiene todos los horarios fijos que permite su plan ({slotLimit}). Quitá uno
              para asignar otro.
            </Alert>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-text">
              <NavIcon name="schedule" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Horarios fijos</h2>
              <p className="mt-1 text-sm text-text-muted">
                {activePlan
                  ? `El plan "${activePlan.planName}" no habilita horarios fijos. Están disponibles cuando el plan tiene más de 3 clases mensuales (por ejemplo 8, 10 o 12).`
                  : 'Este cliente no tiene un plan activo. Asigná un plan de más de 3 clases mensuales para poder configurar horarios fijos.'}
              </p>
            </div>
          </div>
        </section>
      )}

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
    </div>
  );
}
