import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlanFormModal from './PlanFormModal';
import PlansListFilters from './PlansListFilters';
import PlansTable from './PlansTable';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import {
  DEFAULT_PLAN_FILTERS,
  buildPlansListParams,
} from '../../constants/planFilters';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDeletePlan, usePlanDetail, usePlansList } from '../../hooks/usePlans';

function clearPlanQueryParams(searchParams) {
  const next = new URLSearchParams(searchParams);
  next.delete('crear');
  next.delete('editar');
  if (!next.get('tab')) {
    next.set('tab', 'planes');
  }
  return next;
}

export default function PlansPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(DEFAULT_PLAN_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [pendingEditId, setPendingEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const deletePlan = useDeletePlan();

  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const { data: pendingEditPlan } = usePlanDetail(pendingEditId);

  useEffect(() => {
    if (searchParams.get('crear') === '1') {
      setEditingPlan(null);
      setFormModalOpen(true);
      setSearchParams(clearPlanQueryParams(searchParams), { replace: true });
      return;
    }

    const editId = searchParams.get('editar');

    if (editId) {
      setPendingEditId(editId);
      setSearchParams(clearPlanQueryParams(searchParams), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (pendingEditPlan && pendingEditId) {
      setEditingPlan(pendingEditPlan);
      setFormModalOpen(true);
      setPendingEditId(null);
    }
  }, [pendingEditPlan, pendingEditId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.limit]);

  const params = useMemo(
    () =>
      buildPlansListParams(
        {
          ...filters,
          search: debouncedSearch,
        },
        page
      ),
    [debouncedSearch, filters, page]
  );

  const { data, isLoading, isError, isFetching } = usePlansList(params);
  const plans = data?.items || [];
  const pagination = data?.pagination;

  const handleResetAdvancedFilters = () => {
    setFilters((previous) => ({
      ...previous,
      limit: DEFAULT_PLAN_FILTERS.limit,
    }));
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormModalOpen(false);
    setEditingPlan(null);
    setPendingEditId(null);
  };

  const handlePlanSuccess = (plan, action) => {
    setErrorMessage('');

    if (action === 'created') {
      setSuccessMessage(`Plan "${plan.name}" creado correctamente.`);
    } else {
      setSuccessMessage(`Plan "${plan.name}" actualizado correctamente.`);
    }

    window.setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleDeletePlan = async (plan) => {
    setErrorMessage('');

    const confirmed = window.confirm(
      `¿Eliminar el plan "${plan.name}"?\n\n` +
        'Si no tiene historial vinculado, se borrará de la base de datos. ' +
        'Si tiene asignaciones o historial, se desactivará y podrás verlo filtrando por Inactivos.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deletePlan.mutateAsync(plan.id);

      if (result.action === 'deleted') {
        setSuccessMessage(`Plan "${plan.name}" eliminado correctamente.`);
      } else {
        setSuccessMessage(
          `Plan "${plan.name}" desactivado. Podés verlo filtrando por Inactivos.`
        );
      }

      window.setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el plan.');
      window.setTimeout(() => setErrorMessage(''), 6000);
    }
  };

  return (
    <div>
      {successMessage ? (
        <Alert variant="success" className="mb-5">
          {successMessage}
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="error" className="mb-5">
          {errorMessage}
        </Alert>
      ) : null}

      <PlansListFilters
        filters={filters}
        onChange={setFilters}
        onResetAdvanced={handleResetAdvancedFilters}
        expanded={filtersExpanded}
        onToggleExpanded={() => setFiltersExpanded((previous) => !previous)}
        onCreateClick={handleOpenCreate}
      />

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="plans" className="h-5 w-5 text-text" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Listado de planes</h2>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} registrado${pagination?.total === 1 ? '' : 's'}`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          {pagination?.totalPages > 1 ? (
            <p className="text-sm text-text-muted">
              Página {pagination.page} de {pagination.totalPages}
            </p>
          ) : null}
        </div>

        {isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <Alert variant="error">No se pudo cargar el listado de planes.</Alert>
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
            Cargando planes...
          </div>
        ) : (
          <>
            <PlansTable
              plans={plans}
              isFetching={isFetching}
              onEditPlan={handleOpenEdit}
              onDeletePlan={handleDeletePlan}
              deletingPlanId={deletePlan.isPending ? deletePlan.variables : null}
            />

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">
                  Mostrando página {pagination.page} de {pagination.totalPages} ·{' '}
                  {pagination.total} planes en total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <PlanFormModal
        open={formModalOpen}
        onClose={handleCloseModal}
        plan={editingPlan}
        onSuccess={handlePlanSuccess}
      />
    </div>
  );
}
