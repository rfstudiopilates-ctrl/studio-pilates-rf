import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import { CLIENT_STATUS_LABELS } from '../../constants/clients';
import {
  CLIENT_ACCOUNT_FILTER_LABELS,
  CLIENT_LOGIN_FILTER_LABELS,
  CLIENT_PAGE_SIZE_OPTIONS,
  CLIENT_SORT_LABELS,
  countActiveClientFilters,
} from '../../constants/clientFilters';

export default function ClientsListFilters({
  filters,
  onChange,
  onResetAdvanced,
  expanded,
  onToggleExpanded,
  onCreateClick,
}) {
  const activeCount = countActiveClientFilters(filters);

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-end sm:gap-3 lg:gap-4">
          <Input
            label="Buscar"
            placeholder="Nombre, usuario o teléfono..."
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className="w-full min-w-0 sm:min-w-[10rem] sm:flex-[2]"
          />

          <Select
            label="Estado"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="w-full shrink-0 sm:w-28 md:w-32"
          >
            <option value="">Todos</option>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Select
            label="Cuenta"
            value={filters.account}
            onChange={(event) => updateFilter('account', event.target.value)}
            className="w-full shrink-0 sm:w-44 md:w-52"
          >
            {Object.entries(CLIENT_ACCOUNT_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Button
            type="button"
            variant="secondary"
            onClick={onToggleExpanded}
            className="w-full shrink-0 sm:w-auto"
            aria-expanded={expanded}
          >
            <span className="inline-flex items-center gap-2">
              <NavIcon name="filter" className="h-4 w-4" />
              Filtros
              {activeCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-300 px-1.5 text-xs font-semibold text-text">
                  {activeCount}
                </span>
              ) : null}
              <NavIcon
                name="chevronDown"
                className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
            </span>
          </Button>

          <Button type="button" onClick={onCreateClick} className="w-full shrink-0 sm:w-auto">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="plus" className="h-4 w-4" />
              Nuevo cliente
            </span>
          </Button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
          expanded ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Select
                label="Ordenar por"
                value={filters.sortBy}
                onChange={(event) => updateFilter('sortBy', event.target.value)}
              >
                {Object.entries(CLIENT_SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Select
                label="Dirección"
                value={filters.sortOrder}
                onChange={(event) => updateFilter('sortOrder', event.target.value)}
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </Select>

              <Select
                label="Resultados por página"
                value={String(filters.limit)}
                onChange={(event) => updateFilter('limit', Number(event.target.value))}
              >
                {CLIENT_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </Select>

              <Select
                label="Último acceso"
                value={filters.hasLogin}
                onChange={(event) => updateFilter('hasLogin', event.target.value)}
              >
                <option value="">Cualquiera</option>
                {Object.entries(CLIENT_LOGIN_FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Input
                label="Alta desde"
                type="date"
                value={filters.createdFrom}
                onChange={(event) => updateFilter('createdFrom', event.target.value)}
              />

              <Input
                label="Alta hasta"
                type="date"
                value={filters.createdTo}
                onChange={(event) => updateFilter('createdTo', event.target.value)}
              />
            </div>

            {activeCount > 0 ? (
              <div className="mt-4 flex justify-end">
                <Button type="button" variant="ghost" onClick={onResetAdvanced}>
                  Limpiar filtros avanzados
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
