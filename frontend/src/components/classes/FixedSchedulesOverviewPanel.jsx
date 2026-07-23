import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import {
  RECURRING_STATUS_LABELS,
  RECURRING_STATUS_STYLES,
} from '../../constants/reservations';
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from '../../constants/schedules';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAllRecurring, useUpdateRecurring } from '../../hooks/useReservations';
import { getErrorMessage } from '../../lib/formErrors';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        RECURRING_STATUS_STYLES[status] || 'border-border bg-white text-text-muted'
      }`}
    >
      {RECURRING_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function FixedSchedulesOverviewPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const listParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
      dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
    }),
    [debouncedSearch, status, dayOfWeek]
  );

  const { data: recurring = [], isLoading, isError, isFetching } = useAllRecurring(listParams);
  const updateRecurring = useUpdateRecurring();

  const stats = useMemo(() => {
    const active = recurring.filter((item) => item.status === 'active').length;
    const paused = recurring.filter((item) => item.status === 'paused').length;
    return { total: recurring.length, active, paused };
  }, [recurring]);

  const groupedByDay = useMemo(() => {
    const groups = DAY_OF_WEEK_ORDER.map((day) => ({
      day,
      label: DAY_OF_WEEK_LABELS[day],
      items: [],
    }));

    const byDay = new Map(groups.map((group) => [group.day, group]));

    for (const item of recurring) {
      const group = byDay.get(Number(item.dayOfWeek));
      if (group) {
        group.items.push(item);
      }
    }

    return groups.filter((group) => group.items.length > 0);
  }, [recurring]);

  function clearFeedbackLater() {
    window.setTimeout(() => setFeedback(null), 5000);
  }

  async function handleStatusChange(item, nextStatus) {
    setFeedback(null);
    setBusyId(item.id);

    try {
      await updateRecurring.mutateAsync({
        id: item.id,
        payload: { status: nextStatus },
      });

      const labels = {
        paused: `Horario de ${item.clientName} pausado.`,
        active: `Horario de ${item.clientName} reanudado.`,
        cancelled: `Horario fijo de ${item.clientName} eliminado.`,
      };

      setFeedback({
        type: 'success',
        message: labels[nextStatus] || 'Horario fijo actualizado.',
      });
      clearFeedbackLater();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo actualizar el horario fijo.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
          {feedback.message}
        </Alert>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="users" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Horarios fijos por día</p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${stats.total} asignado${stats.total === 1 ? '' : 's'} · ${stats.active} activo${stats.active === 1 ? '' : 's'} · ${stats.paused} pausado${stats.paused === 1 ? '' : 's'}`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
            <Input
              label="Buscar cliente"
              placeholder="Nombre, teléfono o usuario"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              label="Estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Activos y pausados</option>
              <option value="active">Solo activos</option>
              <option value="paused">Solo pausados</option>
            </Select>
            <Select
              label="Día"
              value={dayOfWeek}
              onChange={(event) => setDayOfWeek(event.target.value)}
            >
              <option value="">Todos los días</option>
              {DAY_OF_WEEK_ORDER.map((day) => (
                <option key={day} value={day}>
                  {DAY_OF_WEEK_LABELS[day]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDayOfWeek('')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              !dayOfWeek
                ? 'bg-text text-white'
                : 'border border-border bg-surface-muted/50 text-text-muted hover:text-text'
            }`}
          >
            Todos
          </button>
          {DAY_OF_WEEK_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setDayOfWeek(String(day))}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                String(dayOfWeek) === String(day)
                  ? 'bg-text text-white'
                  : 'border border-border bg-surface-muted/50 text-text-muted hover:text-text'
              }`}
            >
              {DAY_OF_WEEK_LABELS[day].slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      {isError ? (
        <Alert variant="error">No se pudieron cargar los horarios fijos.</Alert>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          Cargando horarios fijos...
        </div>
      ) : groupedByDay.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <p className="text-sm font-semibold text-text">No hay horarios fijos</p>
          <p className="mt-1 text-sm text-text-muted">
            Asigná fijos desde el detalle de cada cliente, o ajustá los filtros de esta vista.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((group) => (
            <section
              key={group.day}
              className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text">{group.label}</h2>
                  <p className="text-sm text-text-muted">
                    {group.items.length} horario{group.items.length === 1 ? '' : 's'} fijo
                    {group.items.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const isBusy = busyId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-border bg-surface-muted/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-text">
                            {getInitials(item.clientName) || '—'}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/clientes/${item.clientId}?tab=reservations`}
                              className="block truncate font-semibold text-text hover:underline"
                            >
                              {item.clientName}
                            </Link>
                            <p className="mt-0.5 text-sm font-medium tabular-nums text-text">
                              {item.startTime}
                            </p>
                            {item.clientPhone ? (
                              <p className="mt-0.5 text-xs text-text-muted">{item.clientPhone}</p>
                            ) : null}
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      {item.status === 'paused' ? (
                        <p className="mt-3 text-xs text-text-muted">
                          Pausado: las clases futuras de este turno están liberadas.
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.status === 'active' ? (
                          <Button
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            disabled={isBusy}
                            isLoading={isBusy}
                            onClick={() => handleStatusChange(item, 'paused')}
                          >
                            Pausar
                          </Button>
                        ) : null}
                        {item.status === 'paused' ? (
                          <Button
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            disabled={isBusy}
                            isLoading={isBusy}
                            onClick={() => handleStatusChange(item, 'active')}
                          >
                            Reanudar
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="h-9 px-3 text-xs text-danger"
                          disabled={isBusy}
                          isLoading={isBusy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Quitar el horario fijo de ${item.clientName} (${DAY_OF_WEEK_LABELS[item.dayOfWeek]} ${item.startTime})? Se liberarán las reservas futuras.`
                              )
                            ) {
                              handleStatusChange(item, 'cancelled');
                            }
                          }}
                        >
                          Quitar
                        </Button>
                        <Link
                          to={`/admin/clientes/${item.clientId}?tab=reservations`}
                          className="inline-flex h-9 items-center rounded-xl px-3 text-xs font-medium text-text-muted transition hover:bg-white hover:text-text"
                        >
                          Ver cliente
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
