import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import ClassesWeekPanel from '../../../components/classes/ClassesWeekPanel';
import FixedSchedulesOverviewPanel from '../../../components/classes/FixedSchedulesOverviewPanel';
import ScheduleChangesPanel from '../../../components/classes/ScheduleChangesPanel';
import SchedulesGridPanel from '../../../components/classes/SchedulesGridPanel';
import PendingDropInRequestsPanel from '../../../components/reservations/PendingDropInRequestsPanel';
import NavIcon from '../../../components/ui/NavIcon';
import { useReservationsList } from '../../../hooks/useReservations';
import { addDaysToDate, getTodayInArgentina } from '../../../lib/dates';

const TABS = [
  { id: 'clases', label: 'Clases', icon: 'classes' },
  { id: 'solicitudes', label: 'Solicitudes', icon: 'bell' },
  { id: 'horarios', label: 'Horarios', icon: 'schedule' },
  { id: 'fijos', label: 'Fijos', icon: 'users' },
  { id: 'cambios', label: 'Cambios', icon: 'swap' },
];

const VALID_TABS = new Set(TABS.map((tab) => tab.id));

function resolveTab(value) {
  if (value === 'cambios-horario' || value === 'cambios') {
    return 'cambios';
  }

  return VALID_TABS.has(value) ? value : 'clases';
}

export default function ClassesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));
  const today = getTodayInArgentina();

  const { data: pendingDropInData } = useReservationsList({
    from: today,
    to: addDaysToDate(today, 60),
    status: 'pending',
    bookingType: 'drop_in',
    page: 1,
    limit: 1,
  });
  const pendingDropInCount = pendingDropInData?.pagination?.total ?? 0;

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get('tab')));
  }, [searchParams]);

  const subtitle = useMemo(() => {
    if (activeTab === 'horarios') {
      return 'Definí los horarios de la grilla semanal que se repiten todas las semanas.';
    }

    if (activeTab === 'fijos') {
      return 'Mirá qué cliente tiene cada horario fijo, por día, y pausalo o quitalo desde acá.';
    }

    if (activeTab === 'solicitudes') {
      return 'Pedidos de clase puntual de clientes sin plan: WhatsApp, seña y confirmación.';
    }

    if (activeTab === 'cambios') {
      return 'Revisá solicitudes de cambio y reasigná reservas.';
    }

    return 'Vista semanal de clases generadas, cupos y reservas.';
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);

    if (tabId === 'clases') {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <AdminLayout title="Clases" subtitle={subtitle}>
      <div className="rounded-2xl border border-border bg-white p-2 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === 'solicitudes' && pendingDropInCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                  isActive
                    ? 'bg-text text-white shadow-sm'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                }`}
              >
                <NavIcon name={tab.icon} className="h-4 w-4" />
                {tab.label}
                {showBadge ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-warning'
                    }`}
                  >
                    {pendingDropInCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'clases' ? <ClassesWeekPanel /> : null}
        {activeTab === 'horarios' ? <SchedulesGridPanel /> : null}
        {activeTab === 'fijos' ? <FixedSchedulesOverviewPanel /> : null}
        {activeTab === 'solicitudes' ? <PendingDropInRequestsPanel /> : null}
        {activeTab === 'cambios' ? <ScheduleChangesPanel /> : null}
      </div>
    </AdminLayout>
  );
}
