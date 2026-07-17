import { useMemo, useState } from 'react';
import ChangePasswordForm from '../auth/ChangePasswordForm';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';
import { Input } from '../ui/Input';
import AdminFormModal from './AdminFormModal';
import { useAuth } from '../../hooks/useAuth';
import { useAdminsList, useDeactivateAdmin, useUpdateAdmin } from '../../hooks/useAdmins';
import { formatDateTime } from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-muted text-text-muted'
      }`}
    >
      {isActive ? 'Activo' : 'Desactivado'}
    </span>
  );
}

export default function AdminsPanel() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState({ message: '', error: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const listParams = useMemo(() => ({ q: search.trim() || undefined, limit: 50 }), [search]);
  const { data, isLoading, isError } = useAdminsList(listParams);
  const deactivateAdmin = useDeactivateAdmin();
  const updateAdmin = useUpdateAdmin();

  const admins = data?.items || [];
  const activeCount = admins.filter((admin) => admin.isActive).length;

  const showFeedback = (message, error = '') => {
    setFeedback({ message, error });
    window.setTimeout(() => {
      setFeedback((current) =>
        current.message === message && current.error === error
          ? { message: '', error: '' }
          : current
      );
    }, 7000);
  };

  const openCreate = () => {
    setEditingAdmin(null);
    setFormOpen(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setFormOpen(true);
  };

  const handleFormSuccess = (_admin, action, message) => {
    showFeedback(
      message ||
        (action === 'created'
          ? 'Administrador creado correctamente.'
          : 'Administrador actualizado correctamente.')
    );
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    try {
      const result = await deactivateAdmin.mutateAsync(deactivateTarget.id);
      setDeactivateTarget(null);
      showFeedback(result.message);
    } catch (error) {
      setDeactivateTarget(null);
      showFeedback('', getErrorMessage(error, 'No se pudo desactivar el administrador.'));
    }
  };

  const handleReactivate = async (admin) => {
    try {
      const result = await updateAdmin.mutateAsync({
        id: admin.id,
        payload: { isActive: true },
      });
      showFeedback(result.message || `"${admin.fullName}" volvió a estar activo.`);
    } catch (error) {
      showFeedback('', getErrorMessage(error, 'No se pudo reactivar el administrador.'));
    }
  };

  return (
    <div className="space-y-6">
      {feedback.error ? <Alert variant="error">{feedback.error}</Alert> : null}
      {feedback.message ? <Alert variant="success">{feedback.message}</Alert> : null}

      <section className="glass-card p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Administradores</h2>
            <p className="mt-1 text-sm text-text-muted">
              Creá y administrá las cuentas con acceso al panel. Siempre tiene que quedar al menos
              un admin activo.
            </p>
          </div>
          <Button onClick={openCreate}>Nuevo admin</Button>
        </div>

        <div className="mb-4 max-w-sm">
          <Input
            label="Buscar"
            placeholder="Nombre, usuario o email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-text-muted">Cargando administradores...</p>
        ) : null}

        {isError ? (
          <Alert variant="error">No se pudo cargar el listado de administradores.</Alert>
        ) : null}

        {!isLoading && !isError && admins.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-sm text-text-muted">
            No hay administradores para mostrar.
          </p>
        ) : null}

        {!isLoading && admins.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Administrador</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Último acceso</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {admins.map((admin) => {
                  const isSelf = Number(admin.id) === Number(user?.id);
                  const canDeactivate = admin.isActive && !isSelf && activeCount > 1;

                  return (
                    <tr key={admin.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{admin.fullName}</div>
                        <div className="text-xs text-text-muted">{admin.email}</div>
                        {isSelf ? (
                          <div className="mt-1 text-xs font-medium text-brand-600">Vos</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{admin.username}</td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={admin.isActive} />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="secondary" onClick={() => openEdit(admin)}>
                            Editar
                          </Button>
                          {admin.isActive ? (
                            <Button
                              variant="danger"
                              disabled={!canDeactivate}
                              title={
                                isSelf
                                  ? 'No podés desactivar tu propia cuenta'
                                  : activeCount <= 1
                                    ? 'Debe quedar al menos un admin activo'
                                    : undefined
                              }
                              onClick={() => setDeactivateTarget(admin)}
                            >
                              Desactivar
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              isLoading={updateAdmin.isPending}
                              onClick={() => handleReactivate(admin)}
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="glass-card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text">Tu contraseña</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cambiá la contraseña con la que ingresás al panel. Después del cambio vas a tener que
            iniciar sesión de nuevo.
          </p>
        </div>
        <div className="max-w-md">
          <ChangePasswordForm />
        </div>
      </section>

      <AdminFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingAdmin(null);
        }}
        admin={editingAdmin}
        currentUserId={user?.id}
        onSuccess={handleFormSuccess}
      />

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        title={`Desactivar a ${deactivateTarget?.fullName || ''}`}
        message="La cuenta dejará de poder iniciar sesión. Los registros históricos del sistema se mantienen. Podés reactivarla después si hace falta."
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        isLoading={deactivateAdmin.isPending}
      />
    </div>
  );
}
