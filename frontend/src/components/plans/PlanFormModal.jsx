import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { PLAN_STATUS_LABELS } from '../../constants/plans';
import { getPlanDurationWeeks } from '../../lib/dates';
import { getFormErrorsFromError } from '../../lib/formErrors';
import { useCreatePlan, useUpdatePlan } from '../../hooks/usePlans';

const emptyForm = {
  name: '',
  description: '',
  price: null,
  weeklyClasses: '2',
  monthlyClasses: '8',
  durationDays: '28',
  status: 'active',
};

function buildFormFromPlan(plan) {
  if (!plan) {
    return emptyForm;
  }

  return {
    name: plan.name || '',
    description: plan.description || '',
    price: plan.price == null ? null : Number(plan.price),
    weeklyClasses: String(plan.weeklyClasses ?? 0),
    monthlyClasses: String(plan.monthlyClasses ?? 0),
    durationDays: String(plan.durationDays ?? 30),
    status: plan.status || 'active',
  };
}

export default function PlanFormModal({ open, onClose, plan, onSuccess }) {
  const isEditing = Boolean(plan?.id);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const isPending = createPlan.isPending || updatePlan.isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormFromPlan(plan));
    setFieldErrors({});
    setFormError('');
  }, [open, plan]);

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const next = { ...previous };
      delete next[key];
      return next;
    });
    setFormError('');
  };

  const handleClose = () => {
    if (isPending) {
      return;
    }

    onClose();
  };

  const weeklyNum = Number(form.weeklyClasses || 0);
  const monthlyNum = Number(form.monthlyClasses || 0);
  const isSingleClass = weeklyNum <= 1 && monthlyNum <= 1;
  const durationWeeks = getPlanDurationWeeks({
    weeklyClasses: weeklyNum,
    monthlyClasses: monthlyNum,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    const weeklyClasses = Number(form.weeklyClasses);
    const monthlyClasses = Number(form.monthlyClasses);
    const singleClass = weeklyClasses <= 1 && monthlyClasses <= 1;
    const weeks = getPlanDurationWeeks({ weeklyClasses, monthlyClasses });

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price || 0),
      weeklyClasses,
      monthlyClasses,
      durationDays: singleClass
        ? Number(form.durationDays)
        : Math.max(1, weeks * 7),
      status: form.status,
    };

    try {
      if (isEditing) {
        const result = await updatePlan.mutateAsync({ id: plan.id, payload });
        onSuccess?.(result.plan || { ...plan, ...payload }, 'updated');
        onClose();
        return;
      }

      const result = await createPlan.mutateAsync(payload);
      onSuccess?.(result.plan || payload, 'created');
      onClose();
    } catch (submitError) {
      const parsed = getFormErrorsFromError(submitError);
      setFieldErrors(parsed.fields || {});
      setFormError(parsed.formError || submitError.message || 'No se pudo guardar el plan.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar plan' : 'Nuevo plan'}
      description={
        isEditing
          ? `Actualizá precio, consumo y vigencia de ${plan.name}.`
          : 'Definí precio, clases semanales/mensuales y duración del plan.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError ? (
          <Alert variant="error" className="py-2 text-sm">
            {formError}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Ej. Mensual 2"
            error={fieldErrors.name}
            autoFocus
            required
          />
          <CurrencyInput
            label="Precio"
            name="price"
            value={form.price}
            onValueChange={(next) => updateField('price', next)}
            allowZero
            error={fieldErrors.price}
          />
          <Input
            label="Clases por semana"
            name="weeklyClasses"
            type="number"
            min="0"
            value={form.weeklyClasses}
            onChange={(event) => updateField('weeklyClasses', event.target.value)}
            error={fieldErrors.weeklyClasses}
            required
          />
          <Input
            label="Clases del abono"
            name="monthlyClasses"
            type="number"
            min="0"
            value={form.monthlyClasses}
            onChange={(event) => updateField('monthlyClasses', event.target.value)}
            error={fieldErrors.monthlyClasses}
            required
          />
          {isSingleClass ? (
            <Input
              label="Duración (días)"
              name="durationDays"
              type="number"
              min="1"
              value={form.durationDays}
              onChange={(event) => updateField('durationDays', event.target.value)}
              error={fieldErrors.durationDays}
              required
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5">
              <p className="text-xs font-medium text-text-muted">Vigencia automática</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {durationWeeks} semana{durationWeeks === 1 ? '' : 's'} ({durationWeeks * 7} días)
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                Se calcula con clases del abono ÷ clases por semana. El cliente puede recuperar
                clases no usadas (o canceladas a tiempo) hasta el fin de esa vigencia.
              </p>
            </div>
          )}
          <Select
            label="Estado"
            name="status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value)}
            error={fieldErrors.status}
          >
            {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Descripción (opcional)"
          name="description"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="Detalles visibles al administrar el plan"
          error={fieldErrors.description}
          rows={3}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending} className="w-full sm:w-auto">
            {isEditing ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
