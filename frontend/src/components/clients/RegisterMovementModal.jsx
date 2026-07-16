import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../constants/finances';
import { MOVEMENT_TYPE_LABELS, formatCurrency } from '../../constants/plans';
import { useCreateMovement } from '../../hooks/useFinances';

const MOVEMENT_OPTIONS = [
  { value: 'payment', label: 'Pago', hint: 'Cobra e incrementa el saldo' },
  { value: 'debt', label: 'Deuda', hint: 'Carga un pendiente' },
  { value: 'credit', label: 'Crédito', hint: 'Ajuste a favor' },
  { value: 'debit', label: 'Débito', hint: 'Devolución / ajuste' },
];

const INITIAL_FORM = {
  type: 'payment',
  amount: null,
  description: '',
  paymentMethod: 'cash',
};

function getBalanceImpact(type, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (type === 'payment' || type === 'credit') return value;
  if (type === 'debt' || type === 'debit') return -value;
  return 0;
}

function optionClass(isSelected) {
  return isSelected
    ? 'border-text bg-surface-muted shadow-sm'
    : 'border-border bg-white hover:border-text/25 hover:bg-surface-muted/40';
}

export default function RegisterMovementModal({
  open,
  onClose,
  clientId,
  currentBalance = 0,
  onSuccess,
}) {
  const createMovement = useCreateMovement();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
    setError('');
    setTouched(false);
  }, [open, clientId]);

  const amountNumber = Number(form.amount);
  const hasValidAmount = Number.isFinite(amountNumber) && amountNumber > 0;
  const hasDescription = form.description.trim().length > 0;

  const impact = useMemo(
    () => getBalanceImpact(form.type, form.amount),
    [form.type, form.amount]
  );
  const nextBalance = useMemo(
    () => Number((Number(currentBalance || 0) + impact).toFixed(2)),
    [currentBalance, impact]
  );

  const canSubmit =
    Boolean(clientId) &&
    hasValidAmount &&
    hasDescription &&
    (form.type !== 'payment' || Boolean(form.paymentMethod));

  const amountError =
    touched && form.amount !== null && !hasValidAmount ? 'Ingresá un monto válido' : '';
  const descriptionError =
    touched && form.description !== '' && !hasDescription ? 'Ingresá una descripción' : '';

  const handleClose = () => {
    if (createMovement.isPending) return;
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError('');

    if (!canSubmit) {
      setError('Completá el monto y la descripción para continuar.');
      return;
    }

    try {
      const result = await createMovement.mutateAsync({
        clientId,
        payload: {
          type: form.type,
          amount: amountNumber,
          description: form.description.trim(),
          paymentMethod: form.type === 'payment' ? form.paymentMethod : undefined,
        },
      });
      onSuccess?.(result);
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo registrar el movimiento.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar movimiento"
      description="Pago, deuda, crédito o débito en la cuenta corriente."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={createMovement.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="register-movement-form"
            isLoading={createMovement.isPending}
          >
            Confirmar
          </Button>
        </div>
      }
    >
      <form id="register-movement-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <Alert variant="error" className="py-2 text-sm">
            {error}
          </Alert>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-text">Tipo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOVEMENT_OPTIONS.map((option) => {
              const isSelected = form.type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, type: option.value }));
                    setError('');
                  }}
                  className={`rounded-xl border px-2.5 py-2.5 text-left transition ${optionClass(isSelected)}`}
                >
                  <p className="text-sm font-semibold text-text">{option.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {form.type === 'payment' ? (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Método de pago</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = form.paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: method }))}
                    className={`rounded-xl border px-2.5 py-2 text-center text-sm font-medium transition ${optionClass(isSelected)}`}
                  >
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <CurrencyInput
            label="Monto"
            value={form.amount}
            onValueChange={(next) => {
              setForm((prev) => ({ ...prev, amount: next }));
              setError('');
            }}
            onBlur={() => setTouched(true)}
            error={amountError}
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, description: event.target.value }));
              setError('');
            }}
            onBlur={() => setTouched(true)}
            placeholder={
              form.type === 'payment'
                ? 'Ej. Pago parcial de plan'
                : form.type === 'debt'
                  ? 'Ej. Saldo pendiente'
                  : 'Detalle del movimiento'
            }
            error={descriptionError}
          />
        </div>

        <div className="rounded-xl border border-border bg-surface-muted/50 px-3.5 py-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Saldo actual</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  Number(currentBalance) < 0 ? 'text-danger' : 'text-text'
                }`}
              >
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">
                {MOVEMENT_TYPE_LABELS[form.type]}
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  impact > 0 ? 'text-success' : impact < 0 ? 'text-danger' : 'text-text-muted'
                }`}
              >
                {impact === 0
                  ? '—'
                  : impact > 0
                    ? `+${formatCurrency(impact)}`
                    : formatCurrency(impact)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Resultante</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  !hasValidAmount
                    ? 'text-text-muted'
                    : nextBalance < 0
                      ? 'text-danger'
                      : 'text-success'
                }`}
              >
                {hasValidAmount ? formatCurrency(nextBalance) : '—'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
