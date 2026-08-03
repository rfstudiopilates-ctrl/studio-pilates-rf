import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../constants/plans';
import { formatDateDisplay, getPlanEndDate, getTodayInArgentina } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';
import { useRenewPlan } from '../../hooks/usePlans';

export default function RenewPlanModal({
  open,
  onClose,
  clientId,
  renewal,
  client,
  onRenewed,
}) {
  const renewPlan = useRenewPlan();
  const [startDate, setStartDate] = useState(getTodayInArgentina());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !renewal) {
      return;
    }

    setStartDate(renewal.defaultRenewStartDate || getTodayInArgentina());
    setError('');
  }, [open, renewal]);

  const previewEndDate = useMemo(() => {
    if (!renewal || !startDate) {
      return '';
    }

    return getPlanEndDate(startDate, {
      weeklyClasses: renewal.weeklyClassesLimit,
      monthlyClasses: renewal.monthlyClassesLimit,
    });
  }, [renewal, startDate]);

  async function handleRenew() {
    if (!renewal) return;
    setError('');

    try {
      const result = await renewPlan.mutateAsync({
        clientId: Number(clientId),
        payload: {
          startDate,
          clientPlanId: renewal.clientPlanId,
        },
      });

      onRenewed?.(result);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo renovar el plan.'));
    }
  }

  if (!renewal) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={renewPlan.isPending ? () => {} : onClose}
      title="Renovar plan"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Se renueva el mismo abono y se mantienen los horarios fijos. Podés ajustar la
          fecha de inicio del nuevo ciclo.
        </p>

        <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
          <p className="text-sm font-semibold text-text">{renewal.planName}</p>
          <p className="mt-1 text-sm text-text-muted">
            Ciclo actual: {formatDateDisplay(renewal.startDate)} →{' '}
            {formatDateDisplay(renewal.endDate)}
            {renewal.inGrace
              ? ` · gracia ${renewal.graceDaysRemaining} día${renewal.graceDaysRemaining === 1 ? '' : 's'}`
              : ''}
          </p>
          <p className="mt-2 text-sm font-medium text-text">
            {formatCurrency(renewal.priceSnapshot)}
          </p>
          {client?.fullName ? (
            <p className="mt-1 text-xs text-text-muted">{client.fullName}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Inicio del nuevo ciclo"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-text">Fin estimado</p>
            <div className="flex h-11 items-center rounded-xl border border-border bg-white px-3 text-sm text-text">
              {previewEndDate ? formatDateDisplay(previewEndDate) : '-'}
            </div>
          </div>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={renewPlan.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleRenew} isLoading={renewPlan.isPending}>
            Renovar plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
