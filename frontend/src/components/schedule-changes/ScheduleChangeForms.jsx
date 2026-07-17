import { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ReassignClassPicker from '../reservations/ReassignClassPicker';
import {
  useCancelScheduleChange,
  useCreateScheduleChange,
  useMyScheduleChanges,
} from '../../hooks/useScheduleChanges';
import { SCHEDULE_CHANGE_STATUS_LABELS } from '../../constants/scheduleChanges';
import { formatDateDisplay } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

export default function ScheduleChangeRequestForm({ reservation, onSuccess }) {
  const createChange = useCreateScheduleChange();
  const [toClassId, setToClassId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!toClassId) {
      setError('Seleccioná la clase destino.');
      return;
    }

    try {
      await createChange.mutateAsync({
        reservationId: reservation.id,
        toGeneratedClassId: Number(toClassId),
        reason: reason || undefined,
      });
      onSuccess?.();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'No se pudo enviar la solicitud de cambio.'));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-xl border border-border bg-surface-muted/50 p-4"
    >
      <p className="text-sm font-medium text-text">Solicitar cambio de horario</p>

      <ReassignClassPicker
        excludeClassId={reservation.generatedClassId}
        value={toClassId}
        onChange={setToClassId}
        disabled={createChange.isPending}
        label="Nueva clase"
      />

      <Input
        label="Motivo (opcional)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Ej: No puedo asistir ese día"
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button
        type="submit"
        isLoading={createChange.isPending}
        disabled={!toClassId}
        className="w-full sm:w-auto"
      >
        Enviar solicitud
      </Button>
    </form>
  );
}

export function MyScheduleChangesSection() {
  const { data, isLoading } = useMyScheduleChanges({ limit: 20 });
  const cancelChange = useCancelScheduleChange();
  const [feedback, setFeedback] = useState('');

  const items = data?.items || [];

  async function handleCancel(id) {
    if (!window.confirm('¿Cancelar esta solicitud de cambio?')) return;

    try {
      await cancelChange.mutateAsync(id);
      setFeedback('Solicitud cancelada.');
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No se pudo cancelar.'));
    }
  }

  return (
    <section className="glass-card p-6">
      <h2 className="text-lg font-semibold text-text">Mis solicitudes de cambio</h2>

      {feedback ? <p className="mt-2 text-sm text-text-muted">{feedback}</p> : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando solicitudes...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">No tenés solicitudes de cambio.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-white p-4 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">
                    {SCHEDULE_CHANGE_STATUS_LABELS[request.status]}
                  </p>
                  <p className="text-text-muted">
                    {formatDateDisplay(request.fromClass?.classDate)} {request.fromClass?.startTime}{' '}
                    → {formatDateDisplay(request.toClass?.classDate)} {request.toClass?.startTime}
                  </p>
                </div>
                {request.status === 'pending' ? (
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs text-red-600"
                    onClick={() => handleCancel(request.id)}
                    isLoading={cancelChange.isPending}
                  >
                    Cancelar solicitud
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
