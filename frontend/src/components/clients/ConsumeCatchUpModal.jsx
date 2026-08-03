import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { getErrorMessage } from '../../lib/formErrors';
import { useConsumeCatchUp } from '../../hooks/usePlans';

export default function ConsumeCatchUpModal({ open, onClose, plan, onSuccess }) {
  const consumeCatchUp = useConsumeCatchUp();
  const catchUpSlots = Number(plan?.availability?.catchUpSlots || plan?.catchUpSlots || 0);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity(catchUpSlots > 0 ? '1' : '0');
    setReason('');
    setError('');
  }, [open, catchUpSlots, plan?.id]);

  async function handleSubmit() {
    setError('');
    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      setError('Indicá una cantidad válida (mínimo 1).');
      return;
    }

    if (qty > catchUpSlots) {
      setError(`Solo hay ${catchUpSlots} clase${catchUpSlots === 1 ? '' : 's'} de recuperación.`);
      return;
    }

    if (reason.trim().length < 3) {
      setError('Indicá el motivo (por ejemplo: ya usó esas clases y no quedaron registradas).');
      return;
    }

    try {
      const result = await consumeCatchUp.mutateAsync({
        assignmentId: plan.id,
        payload: { quantity: qty, reason: reason.trim() },
      });
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo descontar el cupo.'));
    }
  }

  if (!plan) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={consumeCatchUp.isPending ? () => {} : onClose}
      title="Descontar clases de recuperación"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Usá esto cuando el cliente ya usó cupos de recuperación pero no quedaron
          registrados en el sistema. Se descuenta del catch-up y del cupo del abono.
        </p>

        <div className="rounded-xl border border-border bg-surface-muted/40 p-4 text-sm">
          <p className="font-semibold text-text">{plan.planName}</p>
          <p className="mt-1 text-text-muted">
            Recuperación disponible:{' '}
            <span className="font-semibold text-text">{catchUpSlots}</span>
          </p>
          <p className="mt-1 text-text-muted">
            Cupo del plan: {plan.monthlyClassesUsed}/{plan.monthlyClassesLimit}
          </p>
        </div>

        <Input
          label="Cantidad a descontar"
          type="number"
          min={1}
          max={catchUpSlots}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />

        <Textarea
          label="Motivo"
          rows={3}
          placeholder="Ej: Ya usó 2 clases de recuperación en julio y no se cargaron en el sistema."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={consumeCatchUp.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            isLoading={consumeCatchUp.isPending}
            disabled={catchUpSlots <= 0}
          >
            Confirmar descuento
          </Button>
        </div>
      </div>
    </Modal>
  );
}
