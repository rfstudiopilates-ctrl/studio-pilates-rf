import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import {
  BOOKING_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from '../../constants/reservations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useReservationsList } from '../../hooks/useReservations';
import {
  addDaysToDate,
  formatDateDisplay,
  formatDateTime,
  getTodayInArgentina,
} from '../../lib/dates';

const DEFAULT_FILTERS = {
  search: '',
  bookingType: '',
  createdBy: '',
  status: 'confirmed',
  sortBy: 'class_date',
  sortOrder: 'desc',
  from: '',
  to: '',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function createdByLabel(reservation) {
  if (reservation.createdByAdminId) {
    return 'Asignó admin';
  }
  return 'Reservó cliente';
}

export default function ClientManualReservationsPanel() {
  const today = getTodayInArgentina();
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    from: addDaysToDate(today, -45),
    to: addDaysToDate(today, 30),
  });
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.bookingType,
    filters.createdBy,
    filters.status,
    filters.sortBy,
    filters.sortOrder,
    filters.from,
    filters.to,
  ]);

  const listParams = useMemo(
    () => ({
      from: filters.from || undefined,
      to: filters.to || undefined,
      search: debouncedSearch.trim() || undefined,
      bookingType: filters.bookingType || undefined,
      bookingGroup: filters.bookingType ? undefined : 'manual',
      createdBy: filters.createdBy || undefined,
      status: filters.status || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page,
      limit: 20,
    }),
    [filters, debouncedSearch, page]
  );

  const { data, isLoading, isError, isFetching } = useReservationsList(listParams);

  const items = data?.items || [];
  const pagination = data?.pagination;

  function updateFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function resetFilters() {
    setFilters({
      ...DEFAULT_FILTERS,
      from: addDaysToDate(today, -45),
      to: addDaysToDate(today, 30),
    });
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="calendar" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Reservas extra</p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} reserva${
                      (pagination?.total ?? 0) === 1 ? '' : 's'
                    } (estándar, recuperación o puntual)`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={resetFilters}>
            Restablecer filtros
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Buscar cliente"
            name="search"
            placeholder="Nombre, teléfono o usuario"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
          <Select
            label="Tipo"
            value={filters.bookingType}
            onChange={(event) => updateFilter('bookingType', event.target.value)}
          >
            <option value="">Todas las extras</option>
            <option value="standard">Estándar</option>
            <option value="recovery">Recuperación</option>
            <option value="drop_in">Clase puntual</option>
          </Select>
          <Select
            label="Quién la cargó"
            value={filters.createdBy}
            onChange={(event) => updateFilter('createdBy', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="client">Cliente</option>
            <option value="admin">Admin</option>
          </Select>
          <Select
            label="Estado"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="confirmed">Confirmadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="pending">Pendientes</option>
            <option value="">Todos</option>
          </Select>
          <Input
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
          />
          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(event) => updateFilter('sortBy', event.target.value)}
          >
            <option value="class_date">Fecha de clase</option>
            <option value="created_at">Fecha de carga</option>
            <option value="client_name">Nombre</option>
          </Select>
          <Select
            label="Dirección"
            value={filters.sortOrder}
            onChange={(event) => updateFilter('sortOrder', event.target.value)}
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </Select>
        </div>
      </section>

      {isError ? (
        <Alert variant="error">No se pudieron cargar las reservas extra.</Alert>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          Cargando reservas...
        </div>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <p className="text-sm font-semibold text-text">No hay reservas extra</p>
          <p className="mt-1 text-sm text-text-muted">
            Probá ampliar el rango de fechas, cambiar el tipo o limpiar los filtros.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {items.map((reservation) => (
            <article
              key={reservation.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text">
                    {getInitials(reservation.clientName) || '—'}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/clientes/${reservation.clientId}?tab=reservations`}
                        className="truncate text-base font-semibold text-text hover:underline"
                      >
                        {reservation.clientName}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          RESERVATION_STATUS_STYLES[reservation.status] ||
                          'border-border bg-white text-text-muted'
                        }`}
                      >
                        {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
                      </span>
                      <span className="rounded-full border border-border bg-surface-muted/60 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                        {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
                      </span>
                    </div>
                    <p className="text-sm text-text">
                      Clase: {formatDateDisplay(reservation.classDate)} · {reservation.startTime}
                      {reservation.endTime ? `–${reservation.endTime}` : ''}
                    </p>
                    <p className="text-xs text-text-muted">
                      {createdByLabel(reservation)}
                      {reservation.createdAt
                        ? ` · Cargada ${formatDateTime(reservation.createdAt)}`
                        : ''}
                      {reservation.consumesPlan ? ' · Consume cupo' : ' · No consume cupo'}
                    </p>
                    {reservation.clientPhone ? (
                      <p className="text-xs text-text-muted">Tel: {reservation.clientPhone}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination?.totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
