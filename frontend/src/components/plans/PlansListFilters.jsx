import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { Select } from '../ui/Select';
import {
  PLAN_PAGE_SIZE_OPTIONS,
  countActivePlanFilters,
} from '../../constants/planFilters';

export default function PlansListFilters({
  filters,
  onChange,
  onResetAdvanced,
  expanded,
  onToggleExpanded,
  onCreateClick,
}) {
  const activeCount = countActivePlanFilters(filters);

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-end lg:gap-4">
          <Input
            label="Buscar"
            placeholder="Nombre del plan..."
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className="min-w-0 flex-[1_1_12rem] sm:min-w-[10rem] sm:flex-[2]"
          />

          <Select
            label="Estado"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="w-full shrink-0 sm:w-32 md:w-36"
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="">Todos</option>
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
              Nuevo plan
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
                label="Resultados por página"
                value={String(filters.limit)}
                onChange={(event) => updateFilter('limit', Number(event.target.value))}
              >
                {PLAN_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </Select>
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
