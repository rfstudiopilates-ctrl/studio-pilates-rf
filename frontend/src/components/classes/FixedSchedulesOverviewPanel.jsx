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
import { useWeeklySchedule } from '../../hooks/useSchedules';
import { getErrorMessage } from '../../lib/formErrors';

function normalizeTime(value) {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return text.slice(0, 5);
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

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

function RecurringCard({ item, isBusy, onStatusChange }) {
  return (
    <article className="rounded-2xl border border-border bg-surface-muted/30 p-4">
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
              {DAY_OF_WEEK_LABELS[item.dayOfWeek]} · {normalizeTime(item.startTime)}
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
            onClick={() => onStatusChange(item, 'paused')}
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
            onClick={() => onStatusChange(item, 'active')}
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
                `¿Quitar el horario fijo de ${item.clientName} (${DAY_OF_WEEK_LABELS[item.dayOfWeek]} ${normalizeTime(item.startTime)})? Se liberarán las reservas futuras.`
              )
            ) {
              onStatusChange(item, 'cancelled');
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
}

export default function FixedSchedulesOverviewPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [sortBy, setSortBy] = useState('day');
  const [sortOrder, setSortOrder] = useState('asc');
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const listParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
      dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
      startTime: startTime || undefined,
      sortBy,
      sortOrder,
    }),
    [debouncedSearch, status, dayOfWeek, startTime, sortBy, sortOrder]
  );

  const { data: recurring = [], isLoading, isError, isFetching } = useAllRecurring(listParams);
  const { data: weeklySchedule } = useWeeklySchedule();
  const updateRecurring = useUpdateRecurring();

  const timeOptions = useMemo(() => {
    const times = new Set();

    for (const item of recurring) {
      const time = normalizeTime(item.startTime);
      if (time) times.add(time);
    }

    for (const slot of weeklySchedule?.slots || []) {
      const time = normalizeTime(slot.startTime);
      if (time) times.add(time);
    }

    return Array.from(times).sort();
  }, [recurring, weeklySchedule]);

  const stats = useMemo(() => {
    const active = recurring.filter((item) => item.status === 'active').length;
    const paused = recurring.filter((item) => item.status === 'paused').length;
    return { total: recurring.length, active, paused };
  }, [recurring]);

  const groupedSections = useMemo(() => {
    if (sortBy === 'time') {
      const byTime = new Map();

      for (const item of recurring) {
        const time = normalizeTime(item.startTime) || 'Sin hora';
        if (!byTime.has(time)) byTime.set(time, []);
        byTime.get(time).push(item);
      }

      const times = Array.from(byTime.keys()).sort((a, b) =>
        sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
      );

      return times.map((time) => ({
        key: `time-${time}`,
        title: time,
        subtitle: `${byTime.get(time).length} alumno${byTime.get(time).length === 1 ? '' : 's'}`,
        items: byTime.get(time),
      }));
    }

    if (sortBy === 'client') {
      return [
        {
          key: 'clients',
          title: 'Por cliente',
          subtitle: `${recurring.length} horario${recurring.length === 1 ? '' : 's'} fijo${recurring.length === 1 ? '' : 's'}`,
          items: recurring,
        },
      ];
    }

    const groups = DAY_OF_WEEK_ORDER.map((day) => ({
      key: `day-${day}`,
      title: DAY_OF_WEEK_LABELS[day],
      day,
      items: [],
    }));
    const byDay = new Map(groups.map((group) => [group.day, group]));

    for (const item of recurring) {
      const group = byDay.get(Number(item.dayOfWeek));
      if (group) group.items.push(item);
    }

    const ordered = sortOrder === 'desc' ? [...groups].reverse() : groups;

    return ordered
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        key: group.key,
        title: group.title,
        subtitle: `${group.items.length} horario${group.items.length === 1 ? '' : 's'} fijo${group.items.length === 1 ? '' : 's'}`,
        items: group.items,
      }));
  }, [recurring, sortBy, sortOrder]);

  function clearFeedbackLater() {
    window.setTimeout(() => setFeedback(null), 5000);
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setDayOfWeek('');
    setStartTime('');
    setSortBy('day');
    setSortOrder('asc');
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

  const hasActiveFilters = Boolean(
    search || status || dayOfWeek || startTime || sortBy !== 'day' || sortOrder !== 'asc'
  );

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
          {feedback.message}
        </Alert>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

          {hasActiveFilters ? (
            <Button type="button" variant="secondary" onClick={resetFilters}>
              Restablecer filtros
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <Input
            label="Buscar cliente"
            name="fixed-search"
            placeholder="Nombre, teléfono o usuario..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full"
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Horario"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            >
              <option value="">Todos los horarios</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>

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
              label="Organizar por"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="day">Día de la semana</option>
              <option value="time">Horario</option>
              <option value="client">Nombre del cliente</option>
            </Select>

            <Select
              label="Orden"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
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

        {timeOptions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStartTime('')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                !startTime
                  ? 'bg-brand-200 text-text'
                  : 'border border-border bg-white text-text-muted hover:text-text'
              }`}
            >
              Cualquier hora
            </button>
            {timeOptions.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setStartTime(time)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold tabular-nums transition ${
                  startTime === time
                    ? 'bg-brand-200 text-text'
                    : 'border border-border bg-white text-text-muted hover:text-text'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {isError ? (
        <Alert variant="error">No se pudieron cargar los horarios fijos.</Alert>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          Cargando horarios fijos...
        </div>
      ) : groupedSections.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <p className="text-sm font-semibold text-text">No hay horarios fijos</p>
          <p className="mt-1 text-sm text-text-muted">
            Asigná fijos desde el detalle de cada cliente, o ajustá los filtros de esta vista.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {groupedSections.map((section) => (
            <section
              key={section.key}
              className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tabular-nums text-text">{section.title}</h2>
                  <p className="text-sm text-text-muted">{section.subtitle}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <RecurringCard
                    key={item.id}
                    item={item}
                    isBusy={busyId === item.id}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
