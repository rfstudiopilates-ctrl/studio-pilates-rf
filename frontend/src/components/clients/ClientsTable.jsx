import { Link } from 'react-router-dom';
import ClientStatusBadge from './ClientStatusBadge';
import NavIcon from '../ui/NavIcon';
import { formatDateTime } from '../../lib/dates';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatLastAccess(value) {
  if (!value) return 'Sin acceso';
  return formatDateTime(value);
}

const actionButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-medium text-text transition hover:border-brand-300 hover:bg-brand-50 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs md:px-3 md:text-sm whitespace-nowrap';

export default function ClientsTable({ clients, isFetching, onEditClient }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse text-left md:min-w-full">
          <thead>
            <tr className="border-b border-border bg-surface-muted/90">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Cliente
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Usuario
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Plan
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Teléfono
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Estado
              </th>
              <th className="hidden px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:table-cell sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Último acceso
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-text">
                      <NavIcon name="users" className="h-7 w-7" />
                    </div>
                    <p className="text-base font-medium text-text">No hay clientes para mostrar</p>
                    <p className="text-sm text-text-muted">
                      Probá ajustando la búsqueda o los filtros para encontrar resultados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr
                  key={client.id}
                  className={`transition-colors hover:bg-brand-50/40 ${
                    index % 2 === 1 ? 'bg-surface-muted/20' : 'bg-white'
                  } ${isFetching ? 'opacity-80' : ''} ${
                    client.isDeactivated || client.deletedAt ? 'opacity-90' : ''
                  }`}
                >
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-[11px] font-semibold text-text sm:h-9 sm:w-9 sm:rounded-xl sm:text-xs md:h-10 md:w-10">
                        {getInitials(client.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text sm:text-sm">
                          {client.fullName}
                        </p>
                        <p className="truncate text-[10px] text-text-muted sm:text-xs">
                          ID #{client.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <span className="inline-flex max-w-[7rem] truncate rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-text sm:max-w-none sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs">
                      {client.username}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    {client.activePlanName ? (
                      <span className="inline-flex max-w-[9rem] truncate rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-success sm:max-w-[12rem] sm:px-2.5 sm:py-1 sm:text-xs">
                        {client.activePlanName}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-text-muted sm:px-2.5 sm:py-1 sm:text-xs">
                        Sin plan
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-text-muted sm:px-4 sm:text-sm md:px-5 md:py-4">
                    {client.phone || '—'}
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ClientStatusBadge
                        status={client.status}
                        outstandingDebt={client.outstandingDebt}
                        clientId={client.id}
                      />
                      {client.isDeactivated || client.deletedAt ? (
                        <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-danger sm:px-2.5 sm:py-1 sm:text-xs">
                          Desactivado
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-text-muted sm:table-cell sm:px-4 md:px-5 md:py-4">
                    {formatLastAccess(client.lastLoginAt)}
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-1.5 md:gap-2 max-sm:flex-col max-sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => onEditClient(client)}
                        className={actionButtonClass}
                      >
                        <NavIcon name="edit" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Editar
                      </button>
                      <Link to={`/admin/clientes/${client.id}`} className={actionButtonClass}>
                        Detalle
                        <NavIcon name="chevronRight" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
