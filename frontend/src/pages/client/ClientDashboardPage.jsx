import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ClientLayout from '../../components/client/ClientLayout';
import InstallPwaBanner from '../../components/pwa/InstallPwaBanner';
import PushNotificationBanner from '../../components/notifications/PushNotificationBanner';
import { Button } from '../../components/ui/Button';
import NavIcon from '../../components/ui/NavIcon';
import { useMyActivePlan } from '../../hooks/usePlans';
import { useMyReservations } from '../../hooks/useReservations';
import { CLIENT_PLAN_STATUS_LABELS } from '../../constants/plans';
import {
  BOOKING_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from '../../constants/reservations';
import {
  addDaysToDate,
  formatDateDisplay,
  getTodayInArgentina,
  normalizeDateInput,
} from '../../lib/dates';

function getPlanBadgeClass(status) {
  if (status === 'active') return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (status === 'cancelled') return 'border-red-100 bg-red-50 text-danger';
  return 'border-border bg-surface-muted text-text-muted';
}

function PlanUsageCell({ label, used, limit, remaining, hint }) {
  const safeLimit = Number(limit) || 0;
  const safeUsed = Number(used) || 0;
  const safeRemaining = Number(remaining) || 0;
  const pct = safeLimit > 0 ? Math.min(100, Math.round((safeUsed / safeLimit) * 100)) : 0;

  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-text">
          {safeUsed}/{safeLimit || '—'}
        </p>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/70">
        <div
          className="h-full rounded-full bg-brand-300 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-text-muted">
        {safeRemaining} libre{safeRemaining === 1 ? '' : 's'}
        {hint ? ` · ${hint}` : ''}
      </p>
    </div>
  );
}

function CompactPlanCard({ activePlan, isLoading, isError }) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <p className="text-sm text-text-muted">Cargando plan...</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <p className="text-sm text-danger">No se pudo cargar tu plan. Probá actualizar la página.</p>
      </section>
    );
  }

  if (!activePlan) {
    return (
      <section className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
            <NavIcon name="plans" className="h-4 w-4 text-text" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Sin plan activo</p>
            <p className="text-xs text-text-muted">
              Contactá al estudio para activar tu abono.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
          <NavIcon name="plans" className="h-4 w-4 text-text" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-text">{activePlan.planName}</h2>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getPlanBadgeClass(activePlan.status)}`}
            >
              {CLIENT_PLAN_STATUS_LABELS[activePlan.status] || activePlan.status}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-text-muted">
            {formatDateDisplay(activePlan.startDate)} → {formatDateDisplay(activePlan.endDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-surface-muted/40">
        <PlanUsageCell
          label="Semana"
          used={activePlan.weeklyClassesUsed}
          limit={activePlan.weeklyClassesLimit}
          remaining={activePlan.availability?.weeklyRemaining}
          hint={
            Number(activePlan.availability?.catchUpSlots || 0) > 0
              ? `+${activePlan.availability.catchUpSlots} recup.`
              : null
          }
        />
        <PlanUsageCell
          label="Abono"
          used={activePlan.monthlyClassesUsed}
          limit={activePlan.monthlyClassesLimit}
          remaining={activePlan.availability?.monthlyRemaining}
        />
      </div>
    </section>
  );
}

function UpcomingReservationsCard({ reservations, isLoading }) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <p className="text-sm text-text-muted">Cargando reservas...</p>
      </section>
    );
  }

  if (!reservations.length) {
    return (
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="calendar" className="h-4 w-4 text-text" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Reservas</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Todavía no tenés clases reservadas. Elegí un horario para esta semana.
              </p>
            </div>
          </div>
          <Link to="/cliente/reservas" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">Reservar turno</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
            <NavIcon name="calendar" className="h-4 w-4 text-text" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text">Próximas clases</h2>
            <p className="text-[11px] text-text-muted">
              {reservations.length} reserva{reservations.length === 1 ? '' : 's'} activa
              {reservations.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Link
          to="/cliente/reservas"
          className="shrink-0 text-xs font-semibold text-text underline-offset-2 hover:underline"
        >
          Ver todas
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {reservations.map((reservation) => (
          <li key={reservation.id} className="flex items-center justify-between gap-3 px-3.5 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold capitalize text-text">
                {formatDateDisplay(reservation.classDate)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {reservation.startTime} – {reservation.endTime}
                <span className="text-border"> · </span>
                {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                RESERVATION_STATUS_STYLES[reservation.status] ||
                'border-border bg-white text-text-muted'
              }`}
            >
              {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-3.5 py-3 sm:px-4">
        <Link to="/cliente/reservas" className="block">
          <Button variant="secondary" className="w-full">
            Gestionar reservas
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { data: activePlan, isLoading: planLoading, isError: planError } = useMyActivePlan();
  const today = getTodayInArgentina();

  const { data: reservationsData, isLoading: reservationsLoading } = useMyReservations({
    from: today,
    to: addDaysToDate(today, 21),
    limit: 20,
  });

  const upcomingReservations = useMemo(() => {
    const items = (reservationsData?.items || [])
      .filter((item) => ['pending', 'confirmed'].includes(item.status))
      .filter((item) => {
        const dateKey = normalizeDateInput(item.classDate);
        return dateKey && dateKey >= today;
      })
      .sort((a, b) => {
        const dateCmp = String(a.classDate).localeCompare(String(b.classDate));
        if (dateCmp !== 0) return dateCmp;
        return String(a.startTime || '').localeCompare(String(b.startTime || ''));
      });

    return items.slice(0, 5);
  }, [reservationsData, today]);

  const firstName = user?.fullName?.split(' ')?.[0] || 'Cliente';

  return (
    <ClientLayout title={`Hola, ${firstName}`} subtitle="Tu resumen del estudio">
      <div className="mx-auto max-w-3xl space-y-4">
        <InstallPwaBanner />
        <PushNotificationBanner />

        <CompactPlanCard
          activePlan={activePlan}
          isLoading={planLoading}
          isError={planError}
        />

        <UpcomingReservationsCard
          reservations={upcomingReservations}
          isLoading={reservationsLoading}
        />
      </div>
    </ClientLayout>
  );
}
