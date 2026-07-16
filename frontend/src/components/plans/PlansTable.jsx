import PlanStatusBadge from './PlanStatusBadge';
import NavIcon from '../ui/NavIcon';
import { formatCurrency } from '../../constants/plans';
import { getPlanDurationWeeks } from '../../lib/dates';

const actionButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-medium text-text transition hover:border-brand-300 hover:bg-brand-50 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs md:px-3 md:text-sm whitespace-nowrap';

const deleteButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[11px] font-medium text-danger transition hover:border-red-300 hover:bg-red-50 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs md:px-3 md:text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50';

export default function PlansTable({
  plans,
  isFetching,
  onEditPlan,
  onDeletePlan,
  deletingPlanId,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left md:min-w-full">
          <thead>
            <tr className="border-b border-border bg-surface-muted/90">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Plan
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Precio
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Semanal
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Mensual
              </th>
              <th className="hidden px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:table-cell sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Duración
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Estado
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:px-4 sm:py-3 sm:text-xs md:px-5">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-text">
                      <NavIcon name="plans" className="h-7 w-7" />
                    </div>
                    <p className="text-base font-medium text-text">No hay planes para mostrar</p>
                    <p className="text-sm text-text-muted">
                      Probá ajustando la búsqueda o los filtros, o creá un plan nuevo.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              plans.map((plan, index) => (
                <tr
                  key={plan.id}
                  className={`transition-colors hover:bg-brand-50/40 ${
                    index % 2 === 1 ? 'bg-surface-muted/20' : 'bg-white'
                  } ${isFetching ? 'opacity-80' : ''}`}
                >
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-[11px] font-semibold text-text sm:h-9 sm:w-9 sm:rounded-xl sm:text-xs md:h-10 md:w-10">
                        <NavIcon name="plans" className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text sm:text-sm">
                          {plan.name}
                        </p>
                        {plan.description ? (
                          <p className="truncate text-[10px] text-text-muted sm:text-xs">
                            {plan.description}
                          </p>
                        ) : (
                          <p className="truncate text-[10px] text-text-muted sm:text-xs">
                            ID #{plan.id}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-text sm:px-4 sm:text-sm md:px-5 md:py-4">
                    {formatCurrency(plan.price)}
                  </td>
                  <td className="px-3 py-3 text-xs text-text-muted sm:px-4 sm:text-sm md:px-5 md:py-4">
                    {plan.weeklyClasses}
                  </td>
                  <td className="px-3 py-3 text-xs text-text-muted sm:px-4 sm:text-sm md:px-5 md:py-4">
                    {plan.monthlyClasses}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-text-muted sm:table-cell sm:px-4 md:px-5 md:py-4">
                    {getPlanDurationWeeks(plan) > 0
                      ? `${getPlanDurationWeeks(plan)} sem.`
                      : `${plan.durationDays} días`}
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <PlanStatusBadge status={plan.status} />
                  </td>
                  <td className="px-3 py-3 sm:px-4 md:px-5 md:py-4">
                    <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-1.5 md:gap-2 max-sm:flex-col max-sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => onEditPlan(plan)}
                        className={actionButtonClass}
                      >
                        <NavIcon name="edit" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan)}
                        disabled={deletingPlanId === plan.id}
                        className={deleteButtonClass}
                        aria-label={`Eliminar plan ${plan.name}`}
                        title={
                          plan.status === 'inactive'
                            ? 'Eliminar definitivamente si no tiene vínculos'
                            : 'Eliminar o desactivar'
                        }
                      >
                        <NavIcon name="trash" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="sm:hidden">Eliminar</span>
                      </button>
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
