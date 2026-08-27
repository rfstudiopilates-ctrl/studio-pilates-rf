import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import {
  BOOKING_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
} from '../../constants/reservations';
import { HISTORY_ACTION_LABELS } from '../../constants/clients';
import { useClientPlans } from '../../hooks/usePlans';
import { useClientReservations } from '../../hooks/useReservations';
import {
  addDaysToDate,
  formatDateDisplay,
  formatDateTime,
  formatMonthYear,
  getIsoWeekday,
  getMonthEndDate,
  getMonthStartDate,
  getTodayInArgentina,
  normalizeDateInput,
} from '../../lib/dates';

const PERFORMED_BY_LABELS = {
  admin: 'Admin',
  client: 'Cliente',
  system: 'Sistema',
};

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function classifyHistoryItem(item) {
  const description = String(item.description || '');
  const lower = description.toLowerCase();

  if (lower.includes('cupo devuelto')) {
    return { tone: 'success', badge: 'Cupo devuelto' };
  }
  if (lower.includes('cupo consumido') || lower.includes('ausente')) {
    return { tone: 'danger', badge: 'Cupo consumido' };
  }
  if (lower.includes('reserva hecha') || lower.includes('reserva asignada')) {
    return { tone: 'info', badge: 'Reserva' };
  }
  if (lower.includes('cambio de horario')) {
    return { tone: 'info', badge: 'Cambio de horario' };
  }
  if (lower.includes('plan asignado') || lower.includes('plan cancelado')) {
    return { tone: 'neutral', badge: 'Plan' };
  }
  if (lower.includes('horario fijo')) {
    return { tone: 'neutral', badge: 'Fijo' };
  }
  if (lower.includes('pago') || lower.includes('movimiento financiero')) {
    return { tone: 'neutral', badge: 'Finanzas' };
  }

  return {
    tone: 'neutral',
    badge: HISTORY_ACTION_LABELS[item.actionType] || item.actionType,
  };
}

function badgeClass(tone) {
  if (tone === 'success') return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (tone === 'danger') return 'border-red-100 bg-red-50 text-danger';
  if (tone === 'info') return 'border-brand-200 bg-brand-50 text-text';
  return 'border-border bg-surface-muted text-text-muted';
}

function reservationDotClass(reservation) {
  if (reservation.status === 'cancelled') return 'bg-text-muted/40';
  if (reservation.status === 'no_show') return 'bg-danger';
  if (reservation.bookingType === 'recurring') return 'bg-emerald-500';
  if (reservation.bookingType === 'recovery') return 'bg-amber-500';
  if (reservation.bookingType === 'drop_in') return 'bg-violet-500';
  return 'bg-brand-500';
}

function buildMonthCells(monthStart) {
  const start = getMonthStartDate(monthStart);
  const end = getMonthEndDate(monthStart);
  const startWeekday = getIsoWeekday(start);
  const cells = [];

  for (let i = 1; i < startWeekday; i += 1) {
    cells.push(null);
  }

  let cursor = start;
  while (cursor <= end) {
    cells.push(cursor);
    cursor = addDaysToDate(cursor, 1);
  }

  return cells;
}

function shiftMonth(monthStart, delta) {
  const [year, month] = monthStart.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export default function ClientHistoryPanel({
  clientId,
  history,
  historyPage,
  onHistoryPageChange,
}) {
  const today = getTodayInArgentina();
  const [monthStart, setMonthStart] = useState(getMonthStartDate(today));
  const [activityFilter, setActivityFilter] = useState('all');

  const { data: plansData, isLoading: plansLoading } = useClientPlans(clientId);
  const activePlan = plansData?.activePlan;

  const planFrom = normalizeDateInput(activePlan?.startDate) || addDaysToDate(today, -60);
  const planTo = normalizeDateInput(activePlan?.endDate) || addDaysToDate(today, 60);

  const { data: reservationsData, isLoading: reservationsLoading } = useClientReservations(
    clientId,
    {
      from: planFrom,
      to: planTo,
      limit: 100,
      sortBy: 'class_date',
      sortOrder: 'asc',
    }
  );

  const monthFrom = getMonthStartDate(monthStart);
  const monthTo = getMonthEndDate(monthStart);
  const { data: monthReservationsData } = useClientReservations(clientId, {
    from: monthFrom,
    to: monthTo,
    limit: 100,
    sortBy: 'class_date',
    sortOrder: 'asc',
  });

  const monthReservations = monthReservationsData?.items || [];
  const planReservations = reservationsData?.items || [];

  const reservationsByDate = useMemo(() => {
    const map = new Map();
    for (const reservation of monthReservations) {
      const key = normalizeDateInput(reservation.classDate);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(reservation);
    }
    return map;
  }, [monthReservations]);

  const monthCells = useMemo(() => buildMonthCells(monthStart), [monthStart]);

  const consumingInPlan = useMemo(
    () =>
      planReservations.filter(
        (item) =>
          item.consumesPlan &&
          ['pending', 'confirmed', 'completed', 'no_show'].includes(item.status)
      ),
    [planReservations]
  );

  const cancelledReturned = useMemo(
    () =>
      planReservations.filter(
        (item) => item.status === 'cancelled' && item.consumesPlan
      ),
    [planReservations]
  );

  const standardOrRecovery = useMemo(
    () =>
      planReservations.filter((item) =>
        ['standard', 'recovery', 'drop_in'].includes(item.bookingType)
      ),
    [planReservations]
  );

  const availability = activePlan?.availability || {};
  const weeklyLimit = Number(activePlan?.weeklyClassesLimit || 0);
  const monthlyLimit = Number(activePlan?.monthlyClassesLimit || 0);
  const monthlyUsed = Number(
    availability.monthlyUsed ?? activePlan?.monthlyClassesUsed ?? 0
  );
  const monthlyRemaining = Number(
    availability.monthlyRemaining ?? Math.max(0, monthlyLimit - monthlyUsed)
  );
  const catchUpSlots = Number(availability.catchUpSlots || activePlan?.catchUpSlots || 0);
  const expectedUsed = Number(availability.expectedUsed || activePlan?.expectedUsed || 0);
  const usedForCatchUp = Number(
    availability.usedForCatchUp || activePlan?.usedForCatchUp || 0
  );
  const weeklyUsed = Number(availability.weeklyUsed ?? activePlan?.weeklyClassesUsed ?? 0);
  const effectiveWeekly = Number(
    availability.effectiveWeeklyLimit || weeklyLimit + catchUpSlots
  );

  const historyItems = history?.items || [];
  const filteredHistory = useMemo(() => {
    if (activityFilter === 'all') return historyItems;
    return historyItems.filter((item) => {
      const { badge } = classifyHistoryItem(item);
      if (activityFilter === 'quota') {
        return badge === 'Cupo devuelto' || badge === 'Cupo consumido';
      }
      if (activityFilter === 'reservations') {
        return badge === 'Reserva' || badge === 'Cambio de horario' || badge === 'Fijo';
      }
      if (activityFilter === 'plan') {
        return badge === 'Plan' || badge === 'Finanzas';
      }
      return true;
    });
  }, [historyItems, activityFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
            <NavIcon name="plans" className="h-5 w-5 text-text" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">Cupo del plan (explicación)</h2>
            <p className="mt-1 text-sm text-text-muted">
              Acá se entiende de dónde salen las clases “extra” y por qué quedan cupos sin
              cancelar.
            </p>
          </div>
        </div>

        {plansLoading ? (
          <p className="mt-4 text-sm text-text-muted">Cargando plan...</p>
        ) : !activePlan ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-3 text-sm text-text-muted">
            Este cliente no tiene plan activo.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Cupo del abono
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {monthlyUsed} / {monthlyLimit}
                </p>
                <p className="text-xs text-text-muted">Quedan {monthlyRemaining}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Ritmo esperado
                </p>
                <p className="mt-1 text-lg font-semibold text-text">{expectedUsed}</p>
                <p className="text-xs text-text-muted">
                  Según {weeklyLimit}/semana desde {formatDateDisplay(activePlan.startDate)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Recuperación (catch-up)
                </p>
                <p className="mt-1 text-lg font-semibold text-text">{catchUpSlots}</p>
                <p className="text-xs text-text-muted">
                  Esperadas {expectedUsed} − reservadas {usedForCatchUp} (hasta fin de semana)
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Esta semana
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {weeklyUsed} / {effectiveWeekly}
                </p>
                <p className="text-xs text-text-muted">
                  Base {weeklyLimit}
                  {catchUpSlots > 0 ? ` + ${catchUpSlots} recup.` : ''}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-muted/30 px-4 py-3 text-sm text-text">
              {catchUpSlots > 0 ? (
                <p>
                  Tiene <span className="font-semibold">{catchUpSlots} clase(s) de recuperación</span>{' '}
                  esta semana porque, según el ritmo del plan ({weeklyLimit}/semana), debería tener{' '}
                  <span className="font-semibold">{expectedUsed}</span> reservas hasta el domingo de
                  esta semana, pero tiene{' '}
                  <span className="font-semibold">{usedForCatchUp}</span>. Ese saldo habilita una
                  reserva estándar extra esta semana (no es por cancelación). El cupo total del abono
                  sigue siendo {monthlyUsed}/{monthlyLimit}.
                </p>
              ) : (
                <p>
                  No tiene catch-up pendiente: el uso ({monthlyUsed}) está al día o por encima del
                  ritmo esperado ({expectedUsed}). Una reserva estándar solo es posible si queda
                  cupo semanal/mensual libre o si canceló a tiempo antes.
                </p>
              )}
              <p className="mt-2 text-xs text-text-muted">
                Vigencia: {formatDateDisplay(activePlan.startDate)} →{' '}
                {formatDateDisplay(activePlan.endDate)} · {activePlan.planName || 'Plan'}
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-text">
                  Clases que consumieron cupo ({consumingInPlan.length})
                </p>
                {reservationsLoading ? (
                  <p className="mt-2 text-xs text-text-muted">Cargando...</p>
                ) : consumingInPlan.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">Ninguna todavía en esta vigencia.</p>
                ) : (
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                    {consumingInPlan.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                      >
                        <span className="capitalize text-text">
                          {formatDateDisplay(item.classDate)} · {item.startTime}
                        </span>
                        <span className="text-xs text-text-muted">
                          {BOOKING_TYPE_LABELS[item.bookingType] || item.bookingType}
                          {' · '}
                          {RESERVATION_STATUS_LABELS[item.status] || item.status}
                          {item.createdByAdminId ? ' · Admin' : ' · Cliente'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-text">
                  Reservas extra / cancelaciones con cupo
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Estándar / recuperación / puntual ({standardOrRecovery.length})
                    </p>
                    {standardOrRecovery.length === 0 ? (
                      <p className="mt-1 text-xs text-text-muted">Ninguna en la vigencia.</p>
                    ) : (
                      <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto">
                        {standardOrRecovery.map((item) => (
                          <li key={item.id} className="text-xs text-text-muted">
                            <span className="capitalize text-text">
                              {formatDateDisplay(item.classDate)} {item.startTime}
                            </span>
                            {' · '}
                            {BOOKING_TYPE_LABELS[item.bookingType]}
                            {' · '}
                            {RESERVATION_STATUS_LABELS[item.status]}
                            {item.consumesPlan ? ' · consumió cupo' : ' · no consumió cupo'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Canceladas con cupo devuelto ({cancelledReturned.length})
                    </p>
                    {cancelledReturned.length === 0 ? (
                      <p className="mt-1 text-xs text-text-muted">
                        No hay cancelaciones a tiempo que hayan liberado cupo.
                      </p>
                    ) : (
                      <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto">
                        {cancelledReturned.map((item) => (
                          <li key={item.id} className="text-xs text-text-muted">
                            <span className="capitalize text-text">
                              {formatDateDisplay(item.classDate)} {item.startTime}
                            </span>
                            {' · canceló '}
                            {item.cancelledBy === 'admin' ? 'admin' : 'cliente'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="calendar" className="h-5 w-5 text-text" />
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize text-text">
                {formatMonthYear(monthStart)}
              </h2>
              <p className="text-sm text-text-muted">Calendario de reservas del mes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMonthStart((current) => shiftMonth(current, -1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMonthStart(getMonthStartDate(today))}
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMonthStart((current) => shiftMonth(current, 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fijo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Estándar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Recuperación
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> Ausente
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-text-muted/40" /> Cancelada
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-text-muted sm:gap-2 sm:text-xs">
          {DAY_HEADERS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {monthCells.map((dateKey, index) => {
            if (!dateKey) {
              return <div key={`empty-${index}`} className="min-h-[4.5rem] rounded-xl" />;
            }

            const dayReservations = reservationsByDate.get(dateKey) || [];
            const isToday = dateKey === today;

            return (
              <div
                key={dateKey}
                className={`min-h-[4.5rem] rounded-xl border p-1.5 sm:p-2 ${
                  isToday ? 'border-brand-300 bg-brand-50/60' : 'border-border/80 bg-surface-muted/20'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold sm:text-xs ${
                    isToday ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  {Number(dateKey.slice(-2))}
                </p>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayReservations.slice(0, 4).map((reservation) => (
                    <span
                      key={reservation.id}
                      title={`${reservation.startTime} · ${
                        BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType
                      } · ${RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}`}
                      className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${reservationDotClass(reservation)}`}
                    />
                  ))}
                </div>
                {dayReservations[0] ? (
                  <p className="mt-1 hidden truncate text-[10px] text-text-muted sm:block">
                    {dayReservations[0].startTime}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="list" className="h-5 w-5 text-text" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Actividad registrada</h2>
              <p className="text-sm text-text-muted">
                Quién hizo cada acción y si afectó el cupo.
              </p>
            </div>
          </div>
          <Select
            label="Filtrar"
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
            className="w-full sm:w-48"
          >
            <option value="all">Todas</option>
            <option value="quota">Cupo (devuelto/consumido)</option>
            <option value="reservations">Reservas y cambios</option>
            <option value="plan">Plan y finanzas</option>
          </Select>
        </div>

        <div className="mt-5 space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-text-muted">
              No hay actividad con este filtro.
            </div>
          ) : (
            filteredHistory.map((item) => {
              const classified = classifyHistoryItem(item);
              return (
                <article key={item.id} className="relative border-l-2 border-brand-200 pl-4">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brand-400" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(classified.tone)}`}
                    >
                      {classified.badge}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {PERFORMED_BY_LABELS[item.performedByType] || item.performedByType || '—'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-text">{item.description}</p>
                  <p className="mt-1.5 text-xs text-text-muted">{formatDateTime(item.createdAt)}</p>
                </article>
              );
            })
          )}
        </div>

        {history?.pagination?.totalPages > 1 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">
              Página {history.pagination.page} de {history.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={historyPage <= 1}
                onClick={() => onHistoryPageChange(historyPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={historyPage >= history.pagination.totalPages}
                onClick={() => onHistoryPageChange(historyPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
