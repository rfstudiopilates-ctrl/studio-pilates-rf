import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import { SCHEDULE_CHANGE_STATUS_LABELS } from '../../constants/scheduleChanges';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  useApproveScheduleChange,
  useRejectScheduleChange,
  useScheduleChangesList,
} from '../../hooks/useScheduleChanges';
import {
  addDaysToDate,
  formatDateDisplay,
  formatDateTime,
  getTodayInArgentina,
} from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

const DEFAULT_FILTERS = {
  search: '',
  status: 'pending',
  origin: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  from: '',
  to: '',
};

function getStatusBadgeClass(status) {
  if (status === 'pending') {
    return 'bg-amber-50 text-warning border-amber-100';
  }
  if (status === 'approved') {
    return 'bg-emerald-50 text-success border-emerald-100';
  }
  if (status === 'rejected') {
    return 'bg-red-50 text-danger border-red-100';
  }
  return 'bg-surface-muted text-text-muted border-border';
}

export default function ScheduleChangesPanel() {
  const today = getTodayInArgentina();
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    from: addDaysToDate(today, -45),
    to: addDaysToDate(today, 30),
  });
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.status,
    filters.origin,
    filters.sortBy,
    filters.sortOrder,
    filters.from,
    filters.to,
  ]);

  const listParams = useMemo(
    () => ({
      status: filters.status || undefined,
      search: debouncedSearch.trim() || undefined,
      origin: filters.origin || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page,
      limit: 20,
    }),
    [filters, debouncedSearch, page]
  );

  const { data, isLoading, isError, isFetching } = useScheduleChangesList(listParams);
  const approveChange = useApproveScheduleChange();
  const rejectChange = useRejectScheduleChange();

  const items = data?.items || [];
  const pagination = data?.pagination;

  const pendingCountParams = useMemo(
    () => ({
      status: 'pending',
      from: addDaysToDate(today, -45),
      to: addDaysToDate(today, 30),
      page: 1,
      limit: 1,
    }),
    [today]
  );
  const { data: pendingCountData } = useScheduleChangesList(pendingCountParams);
  const pendingCount = pendingCountData?.pagination?.total ?? 0;

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

  async function handleApprove(id) {
    setFeedback(null);

    try {
      await approveChange.mutateAsync({ id, payload: {} });
      setFeedback({
        type: 'success',
        message: 'Cambio de horario aprobado y reserva reasignada.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo aprobar la solicitud.'),
      });
    }
  }

  async function handleReject(id) {
    setFeedback(null);

    try {
      await rejectChange.mutateAsync({
        id,
        payload: { adminNotes: rejectNotes[id] || undefined },
      });
      setFeedback({ type: 'success', message: 'Solicitud rechazada.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo rechazar la solicitud.'),
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

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="swap" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Cambios de horario</p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} en esta vista · ${pendingCount} pendiente${
                      pendingCount === 1 ? '' : 's'
                    }`}
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
            label="Estado"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="">Todas</option>
          </Select>
          <Select
            label="Quién lo pidió"
            value={filters.origin}
            onChange={(event) => updateFilter('origin', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="client">Cliente</option>
            <option value="admin">Admin (reasignación)</option>
          </Select>
          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(event) => updateFilter('sortBy', event.target.value)}
          >
            <option value="created_at">Más recientes</option>
            <option value="class_date">Fecha de clase</option>
            <option value="client_name">Nombre</option>
          </Select>
          <Input
            label="Desde (clase origen)"
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
          />
          <Input
            label="Hasta (clase origen)"
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
          />
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <Alert variant="error">No se pudieron cargar las solicitudes.</Alert>
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          Cargando solicitudes...
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-text">
                <NavIcon name="swap" className="h-7 w-7" />
              </div>
              <p className="text-base font-medium text-text">No hay solicitudes para mostrar</p>
              <p className="max-w-sm text-sm text-text-muted">
                Probá ampliando el rango de fechas, cambiando el estado o limpiando los filtros.
              </p>
            </div>
          ) : (
            <div className={`divide-y divide-border/70 ${isFetching ? 'opacity-80' : ''}`}>
              {items.map((request) => (
                <div key={request.id} className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/clientes/${request.clientId}`}
                          className="font-medium text-text underline-offset-2 hover:underline"
                        >
                          {request.clientName}
                        </Link>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${getStatusBadgeClass(request.status)}`}
                        >
                          {SCHEDULE_CHANGE_STATUS_LABELS[request.status]}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border bg-surface-muted/50 px-2 py-0.5 text-[10px] font-semibold text-text-muted sm:text-xs">
                          Pedido por {request.originLabel || (request.origin === 'admin' ? 'Admin' : 'Cliente')}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted">
                        {request.origin === 'admin'
                          ? `Reasignó admin${request.reviewedByAdminName ? `: ${request.reviewedByAdminName}` : ''}`
                          : 'Solicitó la cliente'}
                        {request.reviewedAt
                          ? ` · Revisado ${formatDateTime(request.reviewedAt)}${
                              request.reviewedByAdminName && request.origin !== 'admin'
                                ? ` por ${request.reviewedByAdminName}`
                                : ''
                            }`
                          : ''}
                        {request.createdAt ? ` · Creado ${formatDateTime(request.createdAt)}` : ''}
                      </p>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            Clase origen
                          </p>
                          <p className="mt-1 font-medium capitalize text-text">
                            {formatDateDisplay(request.fromClass?.classDate)}
                          </p>
                          <p className="text-text-muted">
                            {request.fromClass?.startTime} – {request.fromClass?.endTime}
                          </p>
                        </div>
                        <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 text-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            Clase destino
                          </p>
                          <p className="mt-1 font-medium capitalize text-text">
                            {formatDateDisplay(request.toClass?.classDate)}
                          </p>
                          <p className="text-text-muted">
                            {request.toClass?.startTime} – {request.toClass?.endTime}
                          </p>
                        </div>
                      </div>

                      {request.reason ? (
                        <p className="text-sm text-text-muted">
                          <span className="font-medium text-text">Motivo:</span> {request.reason}
                        </p>
                      ) : null}

                      {request.adminNotes ? (
                        <p className="text-sm text-text-muted">
                          <span className="font-medium text-text">Notas admin:</span>{' '}
                          {request.adminNotes}
                        </p>
                      ) : null}
                    </div>

                    {request.status === 'pending' ? (
                      <div className="w-full shrink-0 space-y-3 lg:max-w-sm">
                        <Input
                          label="Notas de rechazo (opcional)"
                          value={rejectNotes[request.id] || ''}
                          onChange={(event) =>
                            setRejectNotes((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            onClick={() => handleApprove(request.id)}
                            isLoading={approveChange.isPending}
                            className="w-full sm:w-auto"
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleReject(request.id)}
                            isLoading={rejectChange.isPending}
                            className="w-full sm:w-auto"
                          >
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination?.totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        </section>
      )}
    </div>
  );
}
