import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import NavIcon from '../ui/NavIcon';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  SETTLEMENT_ACTION_LABELS,
} from '../../constants/finances';
import { formatCurrency } from '../../constants/plans';
import { useSettlePlanAssignment } from '../../hooks/useFinances';
import { formatDateDisplay } from '../../lib/dates';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function PlanPaymentModal({ open, context, onClose, onSuccess }) {
  const settlePlan = useSettlePlanAssignment();
  const [action, setAction] = useState('pay');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');

  const client = context?.client;
  const plan = context?.plan;
  const amount = Number(context?.amount || plan?.price || 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setAction('pay');
    setPaymentMethod('cash');
    setError('');
  }, [open, context?.clientPlanId]);

  const previewBalance = useMemo(() => {
    if (amount <= 0) {
      return 0;
    }

    if (action === 'pay') {
      return 0;
    }

    return -amount;
  }, [action, amount]);

  const handleClose = async () => {
    if (settlePlan.isPending) {
      return;
    }

    if (amount > 0 && context?.clientPlanId && client) {
      const loadToAccount = window.confirm(
        'El plan ya fue asignado. ¿Querés cargarlo a cuenta corriente?'
      );

      if (loadToAccount) {
        try {
          const result = await settlePlan.mutateAsync({
            clientId: client.id,
            payload: {
              clientPlanId: context.clientPlanId,
              action: 'account',
            },
          });
          onSuccess?.({ ...result, client, plan });
        } catch (submitError) {
          setError(submitError.message || 'No se pudo registrar en cuenta corriente.');
          return;
        }
      }
    }

    onClose();
  };

  const handleConfirm = async () => {
    setError('');

    if (!context?.clientPlanId || !client) {
      setError('No se encontró la asignación del plan.');
      return;
    }

    if (amount <= 0) {
      onSuccess?.({ action: 'none', client, plan, amount: 0 });
      onClose();
      return;
    }

    if (action === 'pay' && !paymentMethod) {
      setError('Seleccioná un método de pago.');
      return;
    }

    try {
      const result = await settlePlan.mutateAsync({
        clientId: client.id,
        payload: {
          clientPlanId: context.clientPlanId,
          action,
          paymentMethod: action === 'pay' ? paymentMethod : undefined,
        },
      });

      onSuccess?.({ ...result, client, plan });
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo registrar el pago.');
    }
  };

  if (!context) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar pago del plan"
      description="Indicá si el cliente paga ahora o si queda en cuenta corriente."
      size="2xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-5">
          {error ? (
            <Alert variant="error" className="py-2 text-sm">
              {error}
            </Alert>
          ) : null}

          <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Resumen</p>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-200 text-sm font-semibold">
                {getInitials(client?.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">{client?.fullName}</p>
                <p className="text-sm text-text-muted">@{client?.username}</p>
                <p className="mt-2 text-sm font-semibold text-text">{plan?.name}</p>
                <p className="text-2xl font-semibold text-text">{formatCurrency(amount)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-text">¿Cómo se registra?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['pay', 'account']).map((option) => {
                const isSelected = action === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAction(option)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                        : 'border-border bg-white hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-text">
                      {SETTLEMENT_ACTION_LABELS[option]}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {option === 'pay'
                        ? 'Se registra la deuda y el pago inmediato.'
                        : 'Queda cargado en la cuenta corriente del cliente.'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {action === 'pay' && amount > 0 ? (
            <div>
              <p className="mb-3 text-sm font-medium text-text">Método de pago</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                          : 'border-border bg-white hover:border-brand-200 hover:bg-brand-50/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-text">
                        {PAYMENT_METHOD_LABELS[method]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-border bg-surface-muted/40 p-4 lg:sticky lg:top-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Vista previa
          </p>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/70 bg-white p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Plan</p>
              <p className="mt-2 text-base font-semibold text-text">{plan?.name}</p>
              <p className="mt-1 font-medium text-text">{formatCurrency(amount)}</p>
              {context?.startDate ? (
                <p className="mt-2 text-xs text-text-muted">
                  Inicio: {formatDateDisplay(context.startDate)}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Movimientos a registrar
              </p>
              {amount <= 0 ? (
                <p className="mt-2 text-text-muted">Sin movimientos financieros.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <NavIcon name="chart" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    <span>
                      Deuda por <strong>{formatCurrency(amount)}</strong>
                    </span>
                  </li>
                  {action === 'pay' ? (
                    <li className="flex items-start gap-2">
                      <NavIcon name="chart" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>
                        Pago con <strong>{PAYMENT_METHOD_LABELS[paymentMethod]}</strong> por{' '}
                        <strong>{formatCurrency(amount)}</strong>
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2 text-text-muted">
                      <span>No se registra pago en este paso.</span>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-white p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Saldo resultante
              </p>
              <p
                className={`mt-2 text-xl font-semibold ${
                  previewBalance < 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {formatCurrency(previewBalance)}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {action === 'pay'
                  ? 'El cliente queda al día con este plan.'
                  : 'El cliente queda con deuda por el monto del plan.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={settlePlan.isPending}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          isLoading={settlePlan.isPending}
          className="w-full sm:w-auto"
        >
          {action === 'pay' ? 'Confirmar pago' : 'Cargar a cuenta corriente'}
        </Button>
      </div>
    </Modal>
  );
}
