import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { CLIENT_STATUS_LABELS } from '../../constants/clients';
import { getFormErrorsFromError, mapBusinessErrorToFields } from '../../lib/formErrors';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';

const emptyForm = {
  fullName: '',
  username: '',
  password: '',
  phone: '',
  status: 'active',
  internalNotes: '',
};

function buildFormFromClient(client) {
  if (!client) {
    return emptyForm;
  }

  return {
    fullName: client.fullName || '',
    username: client.username || '',
    password: '',
    phone: client.phone || '',
    status: client.status || 'active',
    internalNotes: client.internalNotes || '',
  };
}

export default function ClientFormModal({ open, onClose, client, onSuccess }) {
  const isEditing = Boolean(client?.id);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const isPending = createClient.isPending || updateClient.isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextForm = buildFormFromClient(client);
    setForm(nextForm);
    setFieldErrors({});
    setFormError('');
    setShowPassword(false);
    setShowNotes(Boolean(nextForm.internalNotes.trim()));
  }, [open, client]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    try {
      if (isEditing) {
        const payload = {
          fullName: form.fullName,
          username: form.username,
          phone: form.phone,
          status: form.status,
          internalNotes: form.internalNotes.trim() || null,
        };

        if (form.password.trim()) {
          payload.password = form.password;
        }

        const result = await updateClient.mutateAsync({
          id: client.id,
          payload,
        });

        onSuccess?.(result.client, 'updated');
        onClose();
        return;
      }

      const result = await createClient.mutateAsync({
        ...form,
        internalNotes: form.internalNotes.trim() || undefined,
      });

      onSuccess?.(result.client, 'created', {
        password: form.password,
      });
      onClose();
    } catch (submitError) {
      const parsed = getFormErrorsFromError(submitError);
      const business = mapBusinessErrorToFields(submitError.message);

      const fields = {
        ...parsed.fields,
        ...business.fields,
      };

      setFieldErrors(fields);
      setFormError(parsed.formError || business.formError);

      if (fields.password) {
        setShowPassword(true);
      }

      if (fields.internalNotes) {
        setShowNotes(true);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar cliente' : 'Nuevo cliente'}
      description={
        isEditing
          ? `Actualizá los datos de ${client.fullName}.`
          : 'Completá los datos para dar de alta un alumno. Podés editar el resto después.'
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
            label="Nombre completo"
            name="fullName"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="Ej. María García"
            error={fieldErrors.fullName}
            autoFocus
            required
          />
          <Input
            label="Usuario"
            name="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="Ej. maria.garcia"
            error={fieldErrors.username}
            autoComplete="off"
            required
          />
          <Input
            label="Teléfono"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            placeholder="Ej. 5491122334455"
            error={fieldErrors.phone}
          />
          <Select
            label={isEditing ? 'Estado' : 'Estado inicial'}
            name="status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value)}
            error={fieldErrors.status}
          >
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          placeholder={
            isEditing
              ? 'Dejar vacío para no cambiar'
              : 'Ej. DNI o clave de acceso (mín. 6 caracteres)'
          }
          error={fieldErrors.password}
          autoComplete="new-password"
          required={!isEditing}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="rounded-lg p-1 text-text-muted transition hover:text-text"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <NavIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
            </button>
          }
        />

        <div className="rounded-2xl border border-border/80 bg-surface-muted/30">
          <button
            type="button"
            onClick={() => setShowNotes((previous) => !previous)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text"
            aria-expanded={showNotes}
          >
            Observaciones internas (opcional)
            <NavIcon
              name="chevronDown"
              className={`h-4 w-4 text-text-muted transition-transform duration-300 ${showNotes ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
              showNotes ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/70 px-4 pb-4 pt-3">
                <Textarea
                  label="Notas del administrador"
                  name="internalNotes"
                  value={form.internalNotes}
                  onChange={(event) => updateField('internalNotes', event.target.value)}
                  placeholder="Información visible solo para el equipo del estudio"
                  error={fieldErrors.internalNotes}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

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
            {isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
