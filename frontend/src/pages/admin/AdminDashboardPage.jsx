import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import InstallPwaBanner from '../../components/pwa/InstallPwaBanner';
import PushNotificationBanner from '../../components/notifications/PushNotificationBanner';
import WhatsAppReminderButton from '../../components/notifications/WhatsAppReminderButton';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import NavIcon from '../../components/ui/NavIcon';
import { BOOKING_TYPE_LABELS } from '../../constants/reservations';
import { useDashboardToday } from '../../hooks/useDashboard';
import {
  formatDateDisplay,
  getNowPartsInArgentina,
  timeToMinutes,
} from '../../lib/dates';

function getOccupancyTone(classItem) {
  if (classItem.isFull) return 'full';
  if (classItem.occupancyRate >= 70) return 'busy';
  if (classItem.bookedCount > 0) return 'active';
  return 'open';
}

function toneClasses(tone) {
  switch (tone) {
    case 'full':
      return 'border-amber-200 bg-amber-50/50';
    case 'busy':
      return 'border-orange-200 bg-orange-50/40';
    case 'active':
      return 'border-emerald-200 bg-emerald-50/40';
    default:
      return 'border-border bg-white';
  }
}

function OccupancyBar({ booked, capacity, rate }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
        <span>
          {booked} de {capacity} cupos
        </span>
        <span>{rate}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
        <div
          className={`h-full rounded-full ${
            rate >= 100 ? 'bg-warning' : rate >= 70 ? 'bg-orange-400' : rate > 0 ? 'bg-emerald-400' : 'bg-brand-300'
          }`}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
    </div>
  );
}

function ClassCard({ classItem, isNext, isCurrent, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded || isNext || isCurrent);
  const tone = getOccupancyTone(classItem);
  const students = classItem.students || [];

  const toggleExpanded = () => setExpanded((current) => !current);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={toggleExpanded}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleExpanded();
        }
      }}
      className={`cursor-pointer rounded-2xl border p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] transition hover:border-text/20 sm:p-5 ${toneClasses(tone)} ${
        isNext || isCurrent ? 'ring-2 ring-brand-300 ring-offset-2 ring-offset-surface-muted' : ''
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tabular-nums text-text">
              {classItem.startTime} – {classItem.endTime}
            </h3>
            {isCurrent ? (
              <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                En curso
              </span>
            ) : null}
            {isNext && !isCurrent ? (
              <span className="rounded-full bg-text px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Próxima
              </span>
            ) : null}
            {classItem.isFull ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                Completa
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {students.length === 0
              ? 'Sin alumnos reservados'
              : `${students.length} alumno${students.length === 1 ? '' : 's'} · ${classItem.spotsAvailable} libre${classItem.spotsAvailable === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            onClick={toggleExpanded}
          >
            {expanded ? 'Ocultar alumnos' : 'Ver alumnos'}
          </Button>
          <Link to="/admin/clases">
            <Button variant="ghost" className="h-9 px-3 text-xs">
              Ir a clases
            </Button>
          </Link>
        </div>
      </div>

      <OccupancyBar
        booked={classItem.bookedCount}
        capacity={classItem.capacity}
        rate={classItem.occupancyRate}
      />

      {expanded ? (
        <div
          className="mt-4 border-t border-border/70 pt-4"
          onClick={(event) => event.stopPropagation()}
        >
          {students.length === 0 ? (
            <p className="text-sm text-text-muted">Nadie reservó este horario todavía.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-white/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{student.clientName}</p>
                    <p className="truncate text-xs text-text-muted">
                      {student.clientPhone || 'Sin teléfono'}
                      {student.bookingType
                        ? ` · ${BOOKING_TYPE_LABELS[student.bookingType] || student.bookingType}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <WhatsAppReminderButton
                      compact
                      clientName={student.clientName}
                      clientPhone={student.clientPhone}
                      classDate={classItem.classDate}
                      startTime={classItem.startTime}
                    />
                    <Link
                      to={`/admin/clientes/${student.clientId}`}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-muted hover:text-text"
                    >
                      Ver
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, isFetching } = useDashboardToday();
  const now = getNowPartsInArgentina();
  const nowMinutes = timeToMinutes(now.time);

  const allClasses = data?.classes || [];
  const pending = data?.pending;

  const upcomingClasses = useMemo(() => {
    return allClasses.filter(
      (classItem) => timeToMinutes(classItem.endTime) > nowMinutes
    );
  }, [allClasses, nowMinutes]);

  const currentClass = useMemo(() => {
    return (
      upcomingClasses.find((classItem) => {
        const start = timeToMinutes(classItem.startTime);
        const end = timeToMinutes(classItem.endTime);
        return start <= nowMinutes && end > nowMinutes;
      }) || null
    );
  }, [upcomingClasses, nowMinutes]);

  const nextClass = useMemo(() => {
    return (
      upcomingClasses.find((classItem) => timeToMinutes(classItem.startTime) > nowMinutes) ||
      null
    );
  }, [upcomingClasses, nowMinutes]);

  const highlightClass = currentClass || nextClass;

  const summary = useMemo(() => {
    if (upcomingClasses.length === 0) {
      return {
        totalClasses: 0,
        totalBooked: 0,
        totalCapacity: 0,
        occupancyRate: 0,
      };
    }

    const totalBooked = upcomingClasses.reduce(
      (sum, item) => sum + Number(item.bookedCount || 0),
      0
    );
    const totalCapacity = upcomingClasses.reduce(
      (sum, item) => sum + Number(item.capacity || 0),
      0
    );

    return {
      totalClasses: upcomingClasses.length,
      totalBooked,
      totalCapacity,
      occupancyRate: totalCapacity
        ? Math.round((totalBooked / totalCapacity) * 100)
        : 0,
    };
  }, [upcomingClasses]);

  const dayTotalClasses = data?.summary?.totalClasses ?? allClasses.length;
  const highlightId = highlightClass?.id || null;

  return (
    <AdminLayout
      title="Dashboard"
      subtitle={`Clases de hoy · ${formatDateDisplay(data?.date || now.date)}`}
    >
      <InstallPwaBanner className="mb-5" />
      <PushNotificationBanner
        className="mb-5"
        title="Activá avisos en este dispositivo"
        description="Te llegan al celular cuando un cliente reserva, cancela o pide un cambio de horario."
      />

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="classes" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold capitalize text-text">
                {formatDateDisplay(data?.date || now.date)}
              </p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando clases de hoy...'
                  : upcomingClasses.length === 0 && dayTotalClasses > 0
                    ? `Quedan 0 de ${dayTotalClasses} clases · el resto ya finalizó`
                    : `${summary.totalClasses} clase${summary.totalClasses === 1 ? '' : 's'} por delante · ${summary.totalBooked}/${summary.totalCapacity} cupos (${summary.occupancyRate}%)`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/admin/clases">
              <Button variant="secondary" className="w-full sm:w-auto">
                Ver calendario
              </Button>
            </Link>
            <Link to="/admin/reportes">
              <Button variant="secondary" className="w-full sm:w-auto">
                Ir a reportes
              </Button>
            </Link>
            <Link to="/admin/clases?tab=solicitudes">
              <Button variant="secondary" className="w-full sm:w-auto">
                Solicitudes
                {pending?.pendingReservations ? ` (${pending.pendingReservations})` : ''}
              </Button>
            </Link>
            <Link to="/admin/clases?tab=cambios">
              <Button className="w-full sm:w-auto">
                Cambios
                {pending?.pendingScheduleChanges
                  ? ` (${pending.pendingScheduleChanges})`
                  : ''}
              </Button>
            </Link>
          </div>
        </div>

        {!isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-xl bg-surface-muted/70 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Por delante</p>
              <p className="mt-1 text-lg font-semibold text-text">{summary.totalClasses}</p>
            </div>
            <div className="rounded-xl bg-surface-muted/70 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Alumnos</p>
              <p className="mt-1 text-lg font-semibold text-text">{summary.totalBooked}</p>
            </div>
            <div className="rounded-xl bg-surface-muted/70 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Libres</p>
              <p className="mt-1 text-lg font-semibold text-text">
                {Math.max(0, summary.totalCapacity - summary.totalBooked)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-muted/70 px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Ocupación</p>
              <p className="mt-1 text-lg font-semibold text-text">{summary.occupancyRate}%</p>
            </div>
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="mt-5">
          <Alert variant="error">No se pudieron cargar las clases de hoy.</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          Cargando agenda de hoy...
        </div>
      ) : allClasses.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
            <NavIcon name="calendar" className="h-7 w-7 text-text" />
          </div>
          <p className="mt-4 text-base font-semibold text-text">No hay clases programadas hoy</p>
          <p className="mt-1 text-sm text-text-muted">
            Revisá la grilla de horarios o generá las clases del período.
          </p>
          <Link to="/admin/clases?tab=horarios" className="mt-5 inline-block">
            <Button>Ir a horarios</Button>
          </Link>
        </div>
      ) : upcomingClasses.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
            <NavIcon name="calendar" className="h-7 w-7 text-text" />
          </div>
          <p className="mt-4 text-base font-semibold text-text">No quedan clases por delante</p>
          <p className="mt-1 text-sm text-text-muted">
            Las {dayTotalClasses} clase{dayTotalClasses === 1 ? '' : 's'} de hoy ya finalizaron.
          </p>
          <Link to="/admin/clases" className="mt-5 inline-block">
            <Button variant="secondary">Ver calendario completo</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {currentClass ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm">
              <p className="font-semibold text-text">
                En curso: {currentClass.startTime} – {currentClass.endTime}
              </p>
              <p className="mt-0.5 text-text-muted">
                {currentClass.students?.length
                  ? `${currentClass.students.length} alumno${currentClass.students.length === 1 ? '' : 's'} en esta clase`
                  : 'Todavía sin reservas'}
                {nextClass
                  ? ` · Siguiente ${nextClass.startTime}`
                  : ''}
              </p>
            </div>
          ) : nextClass ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm">
              <p className="font-semibold text-text">
                Próxima clase: {nextClass.startTime} – {nextClass.endTime}
              </p>
              <p className="mt-0.5 text-text-muted">
                {nextClass.students?.length
                  ? `${nextClass.students.length} alumno${nextClass.students.length === 1 ? '' : 's'} confirmado${nextClass.students.length === 1 ? '' : 's'}`
                  : 'Todavía sin reservas'}
              </p>
            </div>
          ) : null}

          {upcomingClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              isNext={classItem.id === highlightId}
              isCurrent={classItem.id === currentClass?.id}
              defaultExpanded={classItem.id === highlightId}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
