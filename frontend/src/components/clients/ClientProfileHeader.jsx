import { Link } from 'react-router-dom';
import ClientStatusBadge from './ClientStatusBadge';
import NavIcon from '../ui/NavIcon';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ClientProfileHeader({ client, actions }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-200 text-lg font-bold text-text">
            {getInitials(client.fullName)}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-text">{client.fullName}</h2>
              <ClientStatusBadge status={client.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <NavIcon name="users" className="h-4 w-4" />
                @{client.username}
              </span>
              <span>{client.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </section>
  );
}

export function ClientBackLink() {
  return (
    <Link
      to="/admin/clientes"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-text"
    >
      <NavIcon name="chevronLeft" className="h-4 w-4" />
      Volver al listado
    </Link>
  );
}
