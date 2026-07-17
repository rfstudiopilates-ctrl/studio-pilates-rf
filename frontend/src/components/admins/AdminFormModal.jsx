import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import { getErrorMessage, getFormErrorsFromError, mapBusinessErrorToFields } from '../../lib/formErrors';
import { useCreateAdmin, useUpdateAdmin } from '../../hooks/useAdmins';

const emptyForm = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  isActive: true,
};

function buildFormFromAdmin(admin) {
  if (!admin) {
    return emptyForm;
  }

  return {
    fullName: admin.fullName || '',
    email: admin.email || '',
    username: admin.username || '',
    password: '',
    isActive: admin.isActive !== false,
  };
}

export default function AdminFormModal({ open, onClose, admin, onSuccess, currentUserId }) {
  const isEditing = Boolean(admin?.id);
  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin();

  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isPending = createAdmin.isPending || updateAdmin.isPending;
  const isSelf = isEditing && Number(admin?.id) === Number(currentUserId);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormFromAdmin(admin));
    setFieldErrors({});
    setFormError('');
    setShowPassword(false);
  }, [open, admin]);

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
    if (!isPending) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');

    try {
      if (isEditing) {
        const payload = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
        };

        if (!isSelf) {
          payload.isActive = form.isActive;
        }

        if (form.password.trim()) {
          payload.password = form.password.trim();
        }

        const result = await updateAdmin.mutateAsync({
          id: admin.id,
          payload,
        });

        onSuccess?.(result.admin, 'updated', result.message);
        onClose();
        return;
      }

      const result = await createAdmin.mutateAsync({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
      });

      onSuccess?.(result.admin, 'created', result.message);
      onClose();
    } catch (error) {
      const parsed = getFormErrorsFromError(error);
      const business = mapBusinessErrorToFields(error.message);
      setFieldErrors({
        ...parsed.fields,
        ...business.fields,
      });
      setFormError(parsed.formError || business.formError || getErrorMessage(error, 'No se pudo guardar el administrador.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar administrador' : 'Nuevo administrador'}
      description={
        isEditing
          ? 'Actualizá los datos de acceso. La contraseña solo cambia si completás el campo.'
          : 'Creá un usuario con acceso completo al panel de administración.'
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isPending}>
            {isEditing ? 'Guardar cambios' : 'Crear administrador'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          label="Nombre completo"
          value={form.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          error={fieldErrors.fullName}
          required
        />

        <Input
          label="Email"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          error={fieldErrors.email}
          required
        />

        <Input
          label="Usuario"
          autoComplete="off"
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          error={fieldErrors.username}
          required
        />

        <Input
          label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          error={fieldErrors.password}
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

        {isEditing && !isSelf ? (
          <Select
            label="Estado"
            value={form.isActive ? 'active' : 'inactive'}
            onChange={(event) => updateField('isActive', event.target.value === 'active')}
          >
            <option value="active">Activo</option>
            <option value="inactive">Desactivado</option>
          </Select>
        ) : null}

        {isSelf ? (
          <p className="text-sm text-text-muted">
            Estás editando tu propia cuenta. Para desactivarla pedile a otro administrador.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
