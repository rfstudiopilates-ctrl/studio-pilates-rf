import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../hooks/useSettings';
import StudioLogo from '../studio/StudioLogo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { data: settings } = usePublicSettings();
  const studioName = settings?.studioName || 'Studio Pilates RF';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-surface-muted">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:px-6">
        <section className="hidden lg:block">
          <div className="glass-card p-10">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand-500">
              {studioName}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text">
              Gestión premium para tu estudio
            </h1>
            <p className="mt-4 text-lg leading-8 text-text-muted">
              Accedé de forma segura para administrar turnos, clientes, planes y la
              experiencia completa de tu negocio.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-text-muted">
              <div className="rounded-xl bg-white/70 px-4 py-3">Sesión protegida con JWT</div>
              <div className="rounded-xl bg-white/70 px-4 py-3">Renovación automática de acceso</div>
              <div className="rounded-xl bg-white/70 px-4 py-3">Branding configurable sin código</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:justify-start">
              <StudioLogo settings={settings} size="lg" />
            </div>
            <h2 className="text-3xl font-semibold text-text">{title}</h2>
            <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
          </div>

          <div className="glass-card p-6 sm:p-8">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-text-muted">{footer}</div> : null}

          <p className="mt-8 text-center text-xs text-text-muted lg:text-left">
            {studioName} · Acceso seguro
          </p>
        </section>
      </div>
    </div>
  );
}

export function AuthLink({ to, children }) {
  return (
    <Link to={to} className="font-medium text-text underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
