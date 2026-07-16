import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from '../../constants/finances';
import { formatCurrency } from '../../constants/plans';
import { useCancelPlanAssignment } from '../../hooks/usePlans';
import { formatDateDisplay } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

export default function CancelPlanModal({ open, plan, onClose, onSuccess }) {
  const cancelPlan = useCancelPlanAssignment();
  const [withRefund, setWithRefund] = useState(false);
  const [refundMode, setRefundMode] = useState('full');
  const [refundAmount, setRefundAmount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const financials = plan?.financials || {
    maxCashRefund: 0,
    maxForgive: 0,
    refundMode: 'none',
    paid: 0,
    debted: 0,
  };

  const maxAmount =
    financials.refundMode === 'cash'
      ? Number(financials.maxCashRefund || 0)
      : Number(financials.maxForgive || 0);

  const canRefund = maxAmount > 0;
  const isCashRefund = financials.refundMode === 'cash';

  useEffect(() => {
    if (!open) return;

    setWithRefund(false);
    setRefundMode('full');
    setRefundAmount(maxAmount > 0 ? maxAmount : null);
    setPaymentMethod('cash');
    setNotes('');
    setError('');
  }, [open, plan?.id, maxAmount]);

  const resolvedAmount = useMemo(() => {
    if (!withRefund) return 0;
    if (refundMode === 'full') return maxAmount;
    const parsed = Number(refundAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [withRefund, refundMode, refundAmount, maxAmount]);

  const handleConfirm = async () => {
    setError('');

    if (!plan?.id) {
      setError('No se encontró el plan activo.');
      return;
    }

    if (withRefund) {
      if (!canRefund) {
        setError('No hay montos asociados a este plan para devolver o condonar.');
        return;
      }

      if (!(resolvedAmount > 0)) {
        setError('Indicá un monto mayor a 0.');
        return;
      }

      if (resolvedAmount > maxAmount + 0.001) {
        setError(`El máximo permitido es ${formatCurrency(maxAmount)}.`);
        return;
      }

      if (isCashRefund && !paymentMethod) {
        setError('Seleccioná el método de la devolución.');
        return;
      }
    }

    try {
      const result = await cancelPlan.mutateAsync({
        assignmentId: plan.id,
        payload: {
          withRefund,
          refundAmount: withRefund ? Number(resolvedAmount.toFixed(2)) : undefined,
          paymentMethod: withRefund && isCashRefund ? paymentMethod : undefined,
          notes: notes.trim() || undefined,
        },
      });

      onSuccess?.(result);
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'No se pudo cancelar el plan.'));
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!cancelPlan.isPending) onClose();
      }}
      title="Cancelar plan"
      description="Confirmá si la cancelación incluye devolución o condonación en finanzas."
      size="2xl"
    >
      <div className="space-y-5">
        {error ? (
          <Alert variant="error" className="py-2 text-sm">
            {error}
          </Alert>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Plan activo</p>
          <p className="mt-2 text-lg font-semibold text-text">{plan.planName}</p>
          <p className="mt-1 text-sm text-text-muted">
            {formatDateDisplay(plan.startDate)} → {formatDateDisplay(plan.endDate)}
          </p>
          <p className="mt-2 text-sm font-medium text-text">
            Precio: {formatCurrency(plan.priceSnapshot)}
          </p>
          {canRefund ? (
            <p className="mt-1 text-xs text-text-muted">
              {isCashRefund
                ? `Pagado registrado: ${formatCurrency(financials.paid)}. Máximo a devolver: ${formatCurrency(maxAmount)}.`
                : `Deuda en cuenta: ${formatCurrency(maxAmount)}. Podés condonar total o parcial.`}
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-muted">
              No hay pagos ni deuda vinculada a este plan en finanzas.
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-text">¿Cómo cancelamos?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setWithRefund(false)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                !withRefund
                  ? 'border-text bg-surface-muted/70 ring-2 ring-text/10'
                  : 'border-border bg-white hover:border-text/30'
              }`}
            >
              <p className="text-sm font-semibold text-text">Sin devolución</p>
              <p className="mt-1 text-xs text-text-muted">
                Se cancela el plan y no se modifica el dinero ya registrado.
              </p>
            </button>
            <button
              type="button"
              disabled={!canRefund}
              onClick={() => canRefund && setWithRefund(true)}
              className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                withRefund
                  ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                  : 'border-border bg-white hover:border-brand-200 hover:bg-brand-50/40'
              }`}
            >
              <p className="text-sm font-semibold text-text">
                {isCashRefund ? 'Con devolución' : 'Condonar deuda'}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {isCashRefund
                  ? 'Se resta el monto de tus ingresos en finanzas.'
                  : 'Se elimina total o parcialmente la deuda en cuenta corriente.'}
              </p>
            </button>
          </div>
        </div>

        {withRefund && canRefund ? (
          <div className="space-y-4 rounded-2xl border border-border p-4">
            <div>
              <p className="mb-3 text-sm font-medium text-text">Monto</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefundMode('full');
                    setRefundAmount(maxAmount);
                  }}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    refundMode === 'full'
                      ? 'border-text bg-surface-muted/70'
                      : 'border-border hover:bg-surface-muted/40'
                  }`}
                >
                  <span className="font-semibold text-text">Total</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {formatCurrency(maxAmount)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMode('partial')}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    refundMode === 'partial'
                      ? 'border-text bg-surface-muted/70'
                      : 'border-border hover:bg-surface-muted/40'
                  }`}
                >
                  <span className="font-semibold text-text">Parcial</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    Indicá un monto menor
                  </span>
                </button>
              </div>
            </div>

            {refundMode === 'partial' ? (
              <CurrencyInput
                label={isCashRefund ? 'Monto a devolver' : 'Monto a condonar'}
                value={refundAmount}
                onValueChange={setRefundAmount}
              />
            ) : null}

            {isCashRefund ? (
              <div>
                <p className="mb-2 text-sm font-medium text-text">Método de devolución</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        paymentMethod === method
                          ? 'border-text bg-text text-white'
                          : 'border-border bg-white text-text hover:bg-surface-muted/50'
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Input
              label="Nota (opcional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Motivo de la cancelación o devolución"
            />

            <Alert variant="info" className="text-sm">
              Se registrará {formatCurrency(resolvedAmount)} en finanzas
              {isCashRefund ? ' como devolución (resta de cobros)' : ' como condonación de deuda'}.
            </Alert>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={cancelPlan.isPending}
            className="w-full sm:w-auto"
          >
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={cancelPlan.isPending}
            className="w-full sm:w-auto"
          >
            Confirmar cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
}
