import { useAuth } from '../../hooks/useAuth';
import ClientLayout from '../../components/client/ClientLayout';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import PushNotificationBanner from '../../components/notifications/PushNotificationBanner';
import InstallPwaBanner from '../../components/pwa/InstallPwaBanner';
import NavIcon from '../../components/ui/NavIcon';

const statusLabels = {
  active: 'Activo',
  debt: 'Con deuda',
  suspended: 'Suspendido',
};

function getStatusTone(status) {
  if (status === 'debt') return 'bg-amber-50 text-warning border-amber-100';
  if (status === 'suspended') return 'bg-red-50 text-danger border-red-100';
  return 'bg-emerald-50 text-emerald-800 border-emerald-100';
}

export default function ClientAccountPage() {
  const { user } = useAuth();

  return (
    <ClientLayout title="Mi cuenta" subtitle="Perfil y seguridad">
      <div className="mx-auto max-w-2xl space-y-5">
        <InstallPwaBanner />
        <PushNotificationBanner />

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          <div className="border-b border-border bg-surface-muted/40 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-text">
                <NavIcon name="user" className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-text">
                  {user?.fullName || 'Cliente'}
                </h2>
                <p className="mt-0.5 text-sm text-text-muted">@{user?.username}</p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusTone(user?.status)}`}
                >
                  {statusLabels[user?.status] || user?.status}
                </span>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <dt className="text-sm text-text-muted">Teléfono</dt>
              <dd className="text-sm font-medium text-text">{user?.phone || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <dt className="text-sm text-text-muted">Usuario</dt>
              <dd className="text-sm font-medium text-text">{user?.username || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-text">
              <NavIcon name="lock" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text">Cambiar contraseña</h3>
              <p className="mt-0.5 text-sm text-text-muted">
                Después de actualizarla vas a tener que iniciar sesión de nuevo.
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </section>
      </div>
    </ClientLayout>
  );
}
