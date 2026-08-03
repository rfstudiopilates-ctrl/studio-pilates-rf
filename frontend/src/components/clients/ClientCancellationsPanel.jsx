import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReassignClassPicker from '../reservations/ReassignClassPicker';
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
import {
  useClearCancelledReservation,
  useCreateReservation,
  useReservationsList,
} from '../../hooks/useReservations';
import {
  addDaysToDate,
  formatDateDisplay,
  formatDateTime,
  getTodayInArgentina,
} from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

const CANCELLED_BY_LABELS = {
  client: 'Cliente',
  admin: 'Admin',
};

const DEFAULT_FILTERS = {
  search: '',
  cancelledBy: '',
  bookingType: '',
  quotaOutcome: '',
  cleared: 'open',
  sortBy: 'cancelled_at',
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

function getQuotaOutcome(reservation) {
  if (reservation.status === 'no_show') {
    return 'consumed';
  }
  if (reservation.status === 'cancelled' && reservation.consumesPlan) {
    return 'returned';
  }
  return 'none';
}

function getQuotaBadge(outcome) {
  if (outcome === 'returned') {
    return {
      label: 'Cupo devuelto',
      className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
      hint: 'Canceló a tiempo: el cupo volvió al abono (puede recuperar otro día).',
    };
  }
  if (outcome === 'consumed') {
    return {
      label: 'Cupo consumido',
      className: 'border-red-100 bg-red-50 text-danger',
      hint: 'Ausente / fuera de plazo: la clase se descontó del abono.',
    };
  }
  return {
    label: 'Sin impacto en cupo',
    className: 'border-border bg-surface-muted text-text-muted',
    hint: 'No consumía plan (p. ej. cambio de horario o solicitud sin cupo).',
  };
}

export default function ClientCancellationsPanel() {
  const today = getTodayInArgentina();
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    from: addDaysToDate(today, -45),
    to: addDaysToDate(today, 30),
  });
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [assignForId, setAssignForId] = useState(null);
  const [assignClassId, setAssignClassId] = useState('');
  const [busyId, setBusyId] = useState(null);

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.cancelledBy,
    filters.bookingType,
    filters.quotaOutcome,
    filters.cleared,
    filters.sortBy,
    filters.sortOrder,
    filters.from,
    filters.to,
  ]);

  const listParams = useMemo(
    () => ({
      statusGroup: filters.quotaOutcome ? undefined : 'closures',
      quotaOutcome: filters.quotaOutcome || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      search: debouncedSearch.trim() || undefined,
      cancelledBy: filters.cancelledBy || undefined,
      bookingType: filters.bookingType || undefined,
      cleared: filters.cleared === 'all' ? undefined : filters.cleared,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page,
      limit: 20,
    }),
    [filters, debouncedSearch, page]
  );

  const { data, isLoading, isError, isFetching } = useReservationsList(listParams);
  const createReservation = useCreateReservation();
  const clearCancellation = useClearCancelledReservation();

  const items = data?.items || [];
  const pagination = data?.pagination;
  const openCountParams = useMemo(
    () => ({
      statusGroup: 'closures',
      from: addDaysToDate(today, -45),
      to: addDaysToDate(today, 30),
      cleared: 'open',
      page: 1,
      limit: 1,
    }),
    [today]
  );
  const { data: openCountData } = useReservationsList(openCountParams);
  const openCount = openCountData?.pagination?.total ?? 0;

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

  function clearFeedbackLater() {
    window.setTimeout(() => setFeedback(null), 5000);
  }

  async function handleClear(reservation) {
    setFeedback(null);
    setBusyId(reservation.id);

    try {
      await clearCancellation.mutateAsync(reservation.id);
      if (assignForId === reservation.id) {
        setAssignForId(null);
        setAssignClassId('');
      }
      setFeedback({
        type: 'success',
        message: `Cancelación de ${reservation.clientName} marcada como revisada.`,
      });
      clearFeedbackLater();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo limpiar la cancelación.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssign(reservation) {
    const generatedClassId = Number(assignClassId);
    if (!generatedClassId) {
      setFeedback({
        type: 'error',
        message: 'Elegí un horario disponible para asignar.',
      });
      return;
    }

    setFeedback(null);
    setBusyId(reservation.id);

    try {
      await createReservation.mutateAsync({
        clientId: reservation.clientId,
        generatedClassId,
        status: 'confirmed',
      });

      if (!reservation.adminClearedAt) {
        await clearCancellation.mutateAsync(reservation.id);
      }

      setAssignForId(null);
      setAssignClassId('');
      setFeedback({
        type: 'success',
        message: `Nuevo horario asignado a ${reservation.clientName}.`,
      });
      clearFeedbackLater();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo asignar el nuevo horario.'),
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="close" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Cancelaciones y cupo</p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} en esta vista · ${openCount} sin revisar`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Acá ves si al cancelar se devolvió el cupo o se consumió (ausente / fuera de plazo).
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
            label="Impacto en cupo"
            value={filters.quotaOutcome}
            onChange={(event) => updateFilter('quotaOutcome', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="returned">Cupo devuelto</option>
            <option value="consumed">Cupo consumido</option>
            <option value="none">Sin impacto en cupo</option>
          </Select>
          <Select
            label="Quién canceló"
            value={filters.cancelledBy}
            onChange={(event) => updateFilter('cancelledBy', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="client">Cliente</option>
            <option value="admin">Admin</option>
          </Select>
          <Select
            label="Tipo"
            value={filters.bookingType}
            onChange={(event) => updateFilter('bookingType', event.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(BOOKING_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Estado de revisión"
            value={filters.cleared}
            onChange={(event) => updateFilter('cleared', event.target.value)}
          >
            <option value="open">Sin revisar</option>
            <option value="cleared">Ya revisadas</option>
            <option value="all">Todas</option>
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
            <option value="cancelled_at">Más recientes</option>
            <option value="class_date">Fecha de clase</option>
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
        <Alert variant="error">No se pudieron cargar las cancelaciones.</Alert>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          Cargando cancelaciones...
        </div>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <p className="text-sm font-semibold text-text">No hay cancelaciones</p>
          <p className="mt-1 text-sm text-text-muted">
            {filters.cleared === 'open'
              ? 'No hay cancelaciones pendientes de revisar con estos filtros.'
              : 'Probá ampliar el rango de fechas o limpiar los filtros.'}
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {items.map((reservation) => {
            const isAssigning = assignForId === reservation.id;
            const isBusy = busyId === reservation.id;
            const outcome = getQuotaOutcome(reservation);
            const quotaBadge = getQuotaBadge(outcome);

            return (
              <article
                key={reservation.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                            RESERVATION_STATUS_STYLES.cancelled
                          }`}
                        >
                          {RESERVATION_STATUS_LABELS[reservation.status] ||
                            (reservation.status === 'no_show' ? 'Ausente' : 'Cancelada')}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${quotaBadge.className}`}
                          title={quotaBadge.hint}
                        >
                          {quotaBadge.label}
                        </span>
                        {reservation.adminClearedAt ? (
                          <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                            Revisada
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-warning">
                            Sin revisar
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text">
                        Clase: {formatDateDisplay(reservation.classDate)} ·{' '}
                        {reservation.startTime}
                        {reservation.endTime ? `–${reservation.endTime}` : ''}
                      </p>
                      <p className="text-xs text-text-muted">
                        Canceló {CANCELLED_BY_LABELS[reservation.cancelledBy] || '—'}
                        {reservation.cancelledAt
                          ? ` · ${formatDateTime(reservation.cancelledAt)}`
                          : ''}
                        {' · '}
                        {BOOKING_TYPE_LABELS[reservation.bookingType] || reservation.bookingType}
                      </p>
                      <p className="text-xs text-text-muted">{quotaBadge.hint}</p>
                      {reservation.cancellationReason ? (
                        <p className="text-xs text-text-muted">
                          Motivo: {reservation.cancellationReason}
                        </p>
                      ) : null}
                      {reservation.clientPhone ? (
                        <p className="text-xs text-text-muted">Tel: {reservation.clientPhone}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {!reservation.adminClearedAt ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isBusy}
                        isLoading={isBusy && !isAssigning}
                        onClick={() => handleClear(reservation)}
                      >
                        Limpiar
                      </Button>
                    ) : null}
                    {outcome === 'returned' || outcome === 'none' ? (
                      <Button
                        type="button"
                        variant={isAssigning ? 'secondary' : 'primary'}
                        disabled={isBusy}
                        onClick={() => {
                          if (isAssigning) {
                            setAssignForId(null);
                            setAssignClassId('');
                            return;
                          }
                          setAssignForId(reservation.id);
                          setAssignClassId('');
                        }}
                      >
                        {isAssigning ? 'Cerrar' : 'Asignar horario'}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isAssigning ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface-muted/40 p-3 sm:p-4">
                    <ReassignClassPicker
                      excludeClassId={reservation.generatedClassId}
                      value={assignClassId}
                      onChange={setAssignClassId}
                      disabled={isBusy}
                      label="Nuevo horario"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        disabled={!assignClassId || isBusy}
                        isLoading={isBusy}
                        onClick={() => handleAssign(reservation)}
                      >
                        Confirmar nuevo horario
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
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
