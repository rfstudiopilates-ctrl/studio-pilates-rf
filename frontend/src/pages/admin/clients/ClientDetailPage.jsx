import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  ClientFinanceSection,
  ClientPlanSection,
} from '../../../components/clients/ClientAccountSections';
import { ClientReservationsSection } from '../../../components/clients/ClientReservationsSection';
import ClientHistoryTimeline from '../../../components/clients/ClientHistoryTimeline';
import ClientProfileHeader, { ClientBackLink } from '../../../components/clients/ClientProfileHeader';
import SendCredentialsWhatsAppModal from '../../../components/clients/SendCredentialsWhatsAppModal';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useClientDetail, useDeleteClient } from '../../../hooks/useClients';
import { getErrorMessage } from '../../../lib/formErrors';

const tabs = [
  { id: 'plan', label: 'Plan' },
  { id: 'reservations', label: 'Reservas' },
  { id: 'finances', label: 'Finanzas' },
  { id: 'history', label: 'Historial' },
];

const VALID_TABS = new Set(tabs.map((tab) => tab.id));

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const activeTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'plan';
  const [historyPage, setHistoryPage] = useState(1);
  const [feedback, setFeedback] = useState({ error: '', message: '' });
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading, isError } = useClientDetail(id, { page: historyPage, limit: 10 });
  const deleteClient = useDeleteClient();

  const client = data?.client;
  const history = data?.history;

  useEffect(() => {
    const flashMessage = location.state?.flashMessage;
    if (!flashMessage) return;

    setFeedback({ error: '', message: flashMessage });
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });

    window.setTimeout(() => {
      setFeedback((current) =>
        current.message === flashMessage ? { error: '', message: '' } : current
      );
    }, 6000);
  }, [location.state, location.pathname, location.search, navigate]);

  const selectTab = (tabId, { message } = {}) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tabId === 'plan') {
          next.delete('tab');
        } else {
          next.set('tab', tabId);
        }
        return next;
      },
      { replace: true }
    );

    if (message) {
      setFeedback({ error: '', message });
      window.setTimeout(() => {
        setFeedback((current) =>
          current.message === message ? { error: '', message: '' } : current
        );
      }, 6000);
    }
  };

  const handlePlanAssigned = ({ message } = {}) => {
    selectTab('reservations', {
      message:
        message ||
        'Plan asignado. Ahora podés indicar los horarios fijos del cliente.',
    });
  };

  const handleConfirmDelete = async () => {
    setFeedback({ error: '', message: '' });

    try {
      const result = await deleteClient.mutateAsync(id);
      navigate('/admin/clientes', {
        replace: true,
        state: { flashMessage: result.message },
      });
    } catch (error) {
      setDeleteModalOpen(false);
      setFeedback({ error: getErrorMessage(error, 'No se pudo eliminar el cliente.'), message: '' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Detalle del cliente">
        <div className="rounded-2xl border border-border bg-white p-8 text-sm text-text-muted">
          Cargando cliente...
        </div>
      </AdminLayout>
    );
  }

  if (isError || !client) {
    return (
      <AdminLayout title="Detalle del cliente">
        <Alert variant="error">No se pudo cargar el cliente.</Alert>
      </AdminLayout>
    );
  }

  const headerActions = (
    <>
      <Button variant="secondary" onClick={() => setCredentialsModalOpen(true)}>
        Reenviar acceso
      </Button>
      <Button variant="secondary" onClick={() => setDeleteModalOpen(true)}>
        Eliminar
      </Button>
    </>
  );

  return (
    <AdminLayout
      title={client.fullName}
      subtitle="Perfil completo, plan, finanzas e historial de actividad."
    >
      <ClientBackLink />

      {feedback.error ? (
        <Alert variant="error" className="mb-4">
          {feedback.error}
        </Alert>
      ) : null}
      {feedback.message ? (
        <Alert variant="success" className="mb-4">
          {feedback.message}
        </Alert>
      ) : null}

      <ClientProfileHeader client={client} actions={headerActions} />

      <div className="mt-6 rounded-2xl border border-border bg-white p-2 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-text text-white shadow-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'plan' ? (
          <ClientPlanSection
            clientId={client.id}
            client={client}
            onPlanAssigned={handlePlanAssigned}
          />
        ) : null}
        {activeTab === 'reservations' ? (
          <ClientReservationsSection clientId={client.id} />
        ) : null}
        {activeTab === 'finances' ? (
          <ClientFinanceSection
            clientId={client.id}
            clientPhone={client.phone}
            clientName={client.fullName}
          />
        ) : null}

        {activeTab === 'history' ? (
          <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
            <h2 className="mb-5 text-lg font-semibold text-text">Historial de actividad</h2>

            <ClientHistoryTimeline items={history?.items || []} />

            {history?.pagination?.totalPages > 1 ? (
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">
                  Página {history.pagination.page} de {history.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((current) => current - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={historyPage >= history.pagination.totalPages}
                    onClick={() => setHistoryPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <SendCredentialsWhatsAppModal
        open={credentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        client={client}
        mode="resend"
      />

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Eliminar a ${client.fullName}`}
        message="Si la cuenta no tiene actividad registrada, se elimina definitivamente de la base de datos. Si ya tiene reservas, planes o pagos, se desactiva: el cliente no podrá iniciar sesión ni aparecerá en el listado."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isLoading={deleteClient.isPending}
      />
    </AdminLayout>
  );
}
