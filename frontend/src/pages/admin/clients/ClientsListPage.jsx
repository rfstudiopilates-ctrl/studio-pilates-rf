import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import ClientsListFilters from '../../../components/clients/ClientsListFilters';
import ClientsTable from '../../../components/clients/ClientsTable';
import ClientFormModal from '../../../components/clients/ClientFormModal';
import AssignPlanModal from '../../../components/clients/AssignPlanModal';
import PlanPaymentModal from '../../../components/clients/PlanPaymentModal';
import SendCredentialsWhatsAppModal from '../../../components/clients/SendCredentialsWhatsAppModal';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import NavIcon from '../../../components/ui/NavIcon';
import { PAYMENT_METHOD_LABELS } from '../../../constants/finances';
import {
  DEFAULT_CLIENT_FILTERS,
  buildClientsListParams,
} from '../../../constants/clientFilters';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useClientDetail, useClientsList } from '../../../hooks/useClients';

export default function ClientsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(DEFAULT_CLIENT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);
  const [assignPlanClient, setAssignPlanClient] = useState(null);
  const [paymentContext, setPaymentContext] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [pendingEditId, setPendingEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const paymentRedirectDoneRef = useRef(false);
  const pendingAssignAfterCreateRef = useRef(null);
  const assignPlanOpenTimeoutRef = useRef(null);
  const [page, setPage] = useState(1);
  const [credentialsContext, setCredentialsContext] = useState(null);

  useEffect(() => {
    return () => {
      if (assignPlanOpenTimeoutRef.current) {
        window.clearTimeout(assignPlanOpenTimeoutRef.current);
      }
    };
  }, []);

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const { data: pendingEditData } = useClientDetail(pendingEditId, {
    page: 1,
    limit: 1,
  });

  useEffect(() => {
    if (searchParams.get('crear') === '1') {
      setEditingClient(null);
      setFormModalOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }

    const editId = searchParams.get('editar');

    if (editId) {
      setPendingEditId(editId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (pendingEditData?.client && pendingEditId) {
      setEditingClient(pendingEditData.client);
      setFormModalOpen(true);
      setPendingEditId(null);
    }
  }, [pendingEditData, pendingEditId]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.status,
    filters.hasLogin,
    filters.createdFrom,
    filters.createdTo,
    filters.sortBy,
    filters.sortOrder,
    filters.limit,
  ]);

  const params = useMemo(
    () =>
      buildClientsListParams(
        {
          ...filters,
          search: debouncedSearch,
        },
        page
      ),
    [debouncedSearch, filters, page]
  );

  const { data, isLoading, isError, isFetching } = useClientsList(params);
  const clients = data?.items || [];
  const pagination = data?.pagination;

  const handleResetAdvancedFilters = () => {
    setFilters((previous) => ({
      ...previous,
      hasLogin: '',
      createdFrom: '',
      createdTo: '',
      sortBy: DEFAULT_CLIENT_FILTERS.sortBy,
      sortOrder: DEFAULT_CLIENT_FILTERS.sortOrder,
      limit: DEFAULT_CLIENT_FILTERS.limit,
    }));
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormModalOpen(false);
    setEditingClient(null);
    setPendingEditId(null);
  };

  const handleClientSuccess = (client, action, meta = {}) => {
    if (action === 'created') {
      setSuccessMessage(`Cliente "${client.fullName}" creado correctamente.`);
      pendingAssignAfterCreateRef.current = client;
      setCredentialsContext({
        client,
        password: meta.password || '',
      });
    } else {
      pendingAssignAfterCreateRef.current = null;
      setSuccessMessage(`Cliente "${client.fullName}" actualizado correctamente.`);
    }

    window.setTimeout(() => setSuccessMessage(''), 5000);
  };

  const openAssignPlanModal = (client = null) => {
    if (assignPlanOpenTimeoutRef.current) {
      window.clearTimeout(assignPlanOpenTimeoutRef.current);
      assignPlanOpenTimeoutRef.current = null;
    }

    setAssignPlanClient(client);
    setAssignPlanModalOpen(true);
  };

  const handleCloseAssignPlanModal = () => {
    setAssignPlanModalOpen(false);
    setAssignPlanClient(null);
  };

  const handleCredentialsClose = () => {
    const clientForAssign = pendingAssignAfterCreateRef.current;
    pendingAssignAfterCreateRef.current = null;
    setCredentialsContext(null);

    if (!clientForAssign?.id) {
      return;
    }

    setSuccessMessage(
      `Cliente "${clientForAssign.fullName}" creado. Ahora asignale un plan.`
    );
    window.setTimeout(() => setSuccessMessage(''), 6000);

    assignPlanOpenTimeoutRef.current = window.setTimeout(() => {
      assignPlanOpenTimeoutRef.current = null;
      openAssignPlanModal(clientForAssign);
    }, 180);
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(''), 5000);
  };

  const goToClientReservations = (client, message) => {
    if (!client?.id) return;
    navigate(`/admin/clientes/${client.id}?tab=reservations`, {
      state: { flashMessage: message },
    });
  };

  const handlePlanAssigned = (context) => {
    handleCloseAssignPlanModal();

    if (Number(context.amount) <= 0) {
      goToClientReservations(
        context.client,
        `Plan "${context.plan.name}" asignado. Ahora podés indicar los horarios fijos.`
      );
      return;
    }

    setPaymentContext(context);
    paymentRedirectDoneRef.current = false;
  };

  const handlePaymentSuccess = (result) => {
    const client = result.client || paymentContext?.client;
    const planName = result.plan?.name || paymentContext?.plan?.name || 'plan';
    paymentRedirectDoneRef.current = true;

    if (result.action === 'pay') {
      const methodLabel =
        PAYMENT_METHOD_LABELS[result.paymentMovement?.paymentMethod] || 'pago registrado';
      goToClientReservations(
        client,
        `Plan "${planName}" asignado a ${client?.fullName || 'cliente'}. Pago con ${methodLabel}. Ahora podés indicar los horarios fijos.`
      );
      return;
    }

    if (result.action === 'account') {
      goToClientReservations(
        client,
        `Plan "${planName}" asignado a ${client?.fullName || 'cliente'} en cuenta corriente. Ahora podés indicar los horarios fijos.`
      );
      return;
    }

    goToClientReservations(
      client,
      `Plan "${planName}" asignado. Ahora podés indicar los horarios fijos.`
    );
  };

  return (
    <AdminLayout
      title="Clientes"
      subtitle="Gestioná alumnos, estados, credenciales y observaciones internas."
    >
      {successMessage ? (
        <Alert variant="success" className="mb-5">
          {successMessage}
        </Alert>
      ) : null}

      <ClientsListFilters
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
              <NavIcon name="users" className="h-5 w-5 text-text" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Listado de clientes</h2>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} registrado${pagination?.total === 1 ? '' : 's'}`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {pagination?.totalPages > 1 ? (
              <p className="text-sm text-text-muted sm:mr-2">
                Página {pagination.page} de {pagination.totalPages}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => openAssignPlanModal()}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center gap-2">
                <NavIcon name="plans" className="h-4 w-4" />
                Asignar plan
              </span>
            </Button>
          </div>
        </div>

        {isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <Alert variant="error">No se pudo cargar el listado de clientes.</Alert>
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
            Cargando clientes...
          </div>
        ) : (
          <>
            <ClientsTable
              clients={clients}
              isFetching={isFetching}
              onEditClient={handleOpenEdit}
            />

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">
                  Mostrando página {pagination.page} de {pagination.totalPages} ·{' '}
                  {pagination.total} clientes en total
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

      <ClientFormModal
        open={formModalOpen}
        onClose={handleCloseModal}
        client={editingClient}
        onSuccess={handleClientSuccess}
      />

      <SendCredentialsWhatsAppModal
        open={Boolean(credentialsContext)}
        client={credentialsContext?.client}
        password={credentialsContext?.password}
        onClose={handleCredentialsClose}
      />

      <AssignPlanModal
        open={assignPlanModalOpen}
        initialClient={assignPlanClient}
        onClose={handleCloseAssignPlanModal}
        onAssigned={handlePlanAssigned}
      />

      <PlanPaymentModal
        open={Boolean(paymentContext)}
        context={paymentContext}
        onClose={() => {
          const client = paymentContext?.client;
          const planName = paymentContext?.plan?.name || 'plan';
          setPaymentContext(null);

          if (paymentRedirectDoneRef.current) {
            paymentRedirectDoneRef.current = false;
            return;
          }

          if (client?.id) {
            goToClientReservations(
              client,
              `Plan "${planName}" asignado. Ahora podés indicar los horarios fijos.`
            );
          }
        }}
        onSuccess={handlePaymentSuccess}
      />
    </AdminLayout>
  );
}
