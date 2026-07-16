import { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import { SCHEDULE_CHANGE_STATUS_LABELS } from '../../constants/scheduleChanges';
import {
  useApproveScheduleChange,
  useRejectScheduleChange,
  useScheduleChangesList,
} from '../../hooks/useScheduleChanges';
import { formatDateDisplay } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

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
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});

  const { data, isLoading, isError, isFetching } = useScheduleChangesList({
    status: status || undefined,
    page,
    limit: 20,
  });

  const approveChange = useApproveScheduleChange();
  const rejectChange = useRejectScheduleChange();

  const items = data?.items || [];
  const pagination = data?.pagination;

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
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="swap" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold text-text">Solicitudes de cambio</p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? items.length} solicitud${
                      (pagination?.total ?? items.length) === 1 ? '' : 'es'
                    }`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          <Select
            label="Estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full shrink-0 sm:w-40"
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="">Todas</option>
          </Select>
        </div>

        {feedback ? (
          <div className="mt-4">
            <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
              {feedback.message}
            </Alert>
          </div>
        ) : null}
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
                Probá cambiando el filtro de estado o esperá nuevas solicitudes de clientes.
              </p>
            </div>
          ) : (
            <div className={`divide-y divide-border/70 ${isFetching ? 'opacity-80' : ''}`}>
              {items.map((request) => (
                <div key={request.id} className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-text">{request.clientName}</p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${getStatusBadgeClass(request.status)}`}
                        >
                          {SCHEDULE_CHANGE_STATUS_LABELS[request.status]}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            Clase actual
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
                            Clase solicitada
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
