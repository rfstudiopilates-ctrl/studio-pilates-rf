import { useEffect, useMemo, useState } from 'react';
import ClientStatusBadge from './ClientStatusBadge';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../constants/plans';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useClientsList } from '../../hooks/useClients';
import { useAssignPlan, useClientPlans, usePlansList } from '../../hooks/usePlans';
import { formatDateDisplay, getPlanDurationWeeks, getPlanEndDate, getTodayInArgentina } from '../../lib/dates';

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function AssignPlanModal({
  open,
  onClose,
  onAssigned,
  initialClient = null,
}) {
  const assignPlan = useAssignPlan();
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayInArgentina());
  const [error, setError] = useState('');
  const [clientLocked, setClientLocked] = useState(false);

  const debouncedSearch = useDebouncedValue(clientSearch, 300);
  const initialClientId = initialClient?.id ?? null;

  const { data: clientsData, isFetching: isSearchingClients } = useClientsList(
    {
      q: debouncedSearch.trim() || undefined,
      page: 1,
      limit: 8,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    {
      enabled: open && !clientLocked && debouncedSearch.trim().length >= 2,
    }
  );

  const { data: plansData, isLoading: isLoadingPlans } = usePlansList({
    status: 'active',
    page: 1,
    limit: 100,
  });

  const { data: clientPlansData, isLoading: isLoadingClientPlan } = useClientPlans(
    selectedClient?.id,
    { page: 1, limit: 1 }
  );

  const plans = plansData?.items || [];
  const searchResults = clientsData?.items || [];
  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId));
  const activePlan = clientPlansData?.activePlan;

  const previewEndDate = useMemo(() => {
    if (!selectedPlan || !startDate) {
      return '';
    }

    return getPlanEndDate(startDate, selectedPlan);
  }, [selectedPlan, startDate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPlanId('');
    setStartDate(getTodayInArgentina());
    setError('');

    if (initialClientId && initialClient) {
      setSelectedClient(initialClient);
      setClientSearch(initialClient.fullName || '');
      setClientLocked(true);
    } else {
      setClientSearch('');
      setSelectedClient(null);
      setClientLocked(false);
    }
    // Solo reinicia al abrir o al cambiar el cliente preseleccionado.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialClient se lee al abrir
  }, [open, initialClientId]);

  const handleClose = () => {
    if (assignPlan.isPending) {
      return;
    }

    onClose();
  };

  const handleAssign = async () => {
    setError('');

    if (!selectedClient) {
      setError('Seleccioná un cliente para continuar.');
      return;
    }

    if (activePlan) {
      setError(
        `Este cliente ya tiene el plan "${activePlan.planName}" activo. Cancelalo desde su detalle antes de asignar uno nuevo.`
      );
      return;
    }

    if (!selectedPlanId) {
      setError('Seleccioná un plan para asignar.');
      return;
    }

    try {
      const result = await assignPlan.mutateAsync({
        clientId: selectedClient.id,
        payload: {
          planId: Number(selectedPlanId),
          startDate,
        },
      });

      onAssigned?.({
        client: selectedClient,
        plan: selectedPlan,
        clientPlanId: result.clientPlan.id,
        amount: selectedPlan.price,
        startDate,
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo asignar el plan.');
    }
  };

  const showSearchResults =
    !clientLocked &&
    debouncedSearch.trim().length >= 2 &&
    !selectedClient &&
    searchResults.length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Asignar plan"
      description={
        clientLocked && selectedClient
          ? `Elegí un plan para ${selectedClient.fullName} y confirmá la asignación.`
          : 'Buscá un cliente, elegí un plan y confirmá la asignación en segundos.'
      }
      size="2xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-5">
          {error ? (
            <Alert variant="error" className="py-2 text-sm">
              {error}
            </Alert>
          ) : null}

          {clientLocked && selectedClient ? (
            <Alert variant="success" className="py-2 text-sm">
              Cliente listo. Continuá eligiendo el plan para completar el alta.
            </Alert>
          ) : null}

          <div>
            {clientLocked && selectedClient ? (
              <div>
                <p className="mb-2 text-sm font-medium text-text">Cliente</p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-xs font-semibold">
                      {getInitials(selectedClient.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {selectedClient.fullName}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        @{selectedClient.username} · {selectedClient.phone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientLocked(false);
                      setSelectedClient(null);
                      setClientSearch('');
                      setError('');
                    }}
                    className="shrink-0 text-xs font-medium text-text-muted hover:text-text"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Input
                  label="Buscar cliente"
                  placeholder="Nombre, usuario o teléfono (mín. 2 caracteres)"
                  value={clientSearch}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    if (selectedClient) {
                      setSelectedClient(null);
                    }
                  }}
                  autoFocus
                />

                {selectedClient ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-xs font-semibold">
                        {getInitials(selectedClient.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {selectedClient.fullName}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          @{selectedClient.username} · {selectedClient.phone}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="shrink-0 text-xs font-medium text-text-muted hover:text-text"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : null}

                {isSearchingClients && debouncedSearch.trim().length >= 2 ? (
                  <p className="mt-2 text-xs text-text-muted">Buscando clientes...</p>
                ) : null}

                {showSearchResults ? (
                  <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-1">
                    {searchResults.map((client) => (
                      <li key={client.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearch(client.fullName);
                            setError('');
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-brand-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold">
                            {getInitials(client.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text">
                              {client.fullName}
                            </p>
                            <p className="truncate text-xs text-text-muted">
                              @{client.username} · {client.phone}
                            </p>
                          </div>
                          <ClientStatusBadge status={client.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {debouncedSearch.trim().length >= 2 &&
                !isSearchingClients &&
                !selectedClient &&
                searchResults.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">No se encontraron clientes.</p>
                ) : null}
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text">Plan a asignar</p>
            {isLoadingPlans ? (
              <p className="text-sm text-text-muted">Cargando planes...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-text-muted">No hay planes activos disponibles.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {plans.map((plan) => {
                  const isSelected = String(plan.id) === String(selectedPlanId);

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(String(plan.id))}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                          : 'border-border bg-white hover:border-brand-200 hover:bg-brand-50/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-text">{plan.name}</p>
                      <p className="mt-1 text-sm font-medium text-text">{formatCurrency(plan.price)}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {plan.weeklyClasses}/sem · {plan.monthlyClasses} clases ·{' '}
                        {getPlanDurationWeeks(plan) || plan.durationDays} sem.
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Input
              label="Inicio del plan"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <p className="mt-2 text-xs text-text-muted">
              El cobro o la cuenta corriente se registran en el paso siguiente.
            </p>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-surface-muted/40 p-4 lg:sticky lg:top-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Vista previa
          </p>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Cliente</p>
              {selectedClient ? (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-200 text-sm font-semibold">
                    {getInitials(selectedClient.fullName)}
                  </div>
                  <div>
                    <p className="font-medium text-text">{selectedClient.fullName}</p>
                    <p className="text-xs text-text-muted">@{selectedClient.username}</p>
                    <p className="text-xs text-text-muted">{selectedClient.phone}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-muted">Seleccioná un cliente para ver la vista previa.</p>
              )}
            </div>

            {selectedClient && isLoadingClientPlan ? (
              <p className="text-xs text-text-muted">Verificando plan activo...</p>
            ) : null}

            {selectedClient && activePlan ? (
              <Alert variant="error" className="py-2 text-xs">
                Este cliente ya tiene el plan <strong>{activePlan.planName}</strong> activo.
                Cancelalo desde el detalle del cliente antes de asignar uno nuevo.
              </Alert>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Plan</p>
              {selectedPlan ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-base font-semibold text-text">{selectedPlan.name}</p>
                  <p className="font-medium text-text">{formatCurrency(selectedPlan.price)}</p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-text-muted">Ritmo semanal</dt>
                      <dd className="font-medium text-text">{selectedPlan.weeklyClasses}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Clases del abono</dt>
                      <dd className="font-medium text-text">{selectedPlan.monthlyClasses}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Vigencia</dt>
                      <dd className="font-medium text-text">
                        {getPlanDurationWeeks(selectedPlan)} semanas
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Pago</dt>
                      <dd className="font-medium text-text">Siguiente paso</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-muted">Elegí un plan para continuar.</p>
              )}
            </div>

            {selectedPlan && startDate ? (
              <div className="rounded-xl border border-border/70 bg-white p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Vigencia</p>
                <p className="mt-2 font-medium text-text">
                  {formatDateDisplay(startDate)} → {formatDateDisplay(previewEndDate)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Empieza el {formatDateDisplay(startDate)}. La vigencia se calcula con las clases
                  del abono ({selectedPlan.monthlyClasses} ÷ {selectedPlan.weeklyClasses} ={' '}
                  {getPlanDurationWeeks(selectedPlan)} semanas). Si arrancás después del inicio,
                  las clases no usadas se pueden recuperar hasta el fin del plan.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={assignPlan.isPending}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleAssign}
          isLoading={assignPlan.isPending}
          disabled={!selectedClient || !selectedPlanId || Boolean(activePlan)}
          className="w-full sm:w-auto"
        >
          Continuar
        </Button>
      </div>
    </Modal>
  );
}
