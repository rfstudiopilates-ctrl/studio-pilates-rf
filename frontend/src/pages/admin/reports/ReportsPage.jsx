import { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/dashboard/KpiCard';
import SimpleBarChart from '../../../components/dashboard/SimpleBarChart';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { formatCurrency } from '../../../constants/plans';
import {
  CLIENT_STATUS_LABELS,
  DAY_LABELS,
  PERIOD_OPTIONS,
  RECOVERY_STATUS_LABELS,
  REPORT_TYPES,
  RESERVATION_STATUS_LABELS,
} from '../../../constants/reports';
import { useDashboardOverview } from '../../../hooks/useDashboard';
import { useExportReport, useReportPreview } from '../../../hooks/useReports';
import { formatDateDisplay, formatDateTime } from '../../../lib/dates';
import { getErrorMessage } from '../../../lib/formErrors';

function formatDate(value) {
  if (!value) return '-';
  return formatDateDisplay(String(value).slice(0, 10));
}

function formatPeriodLabel(range) {
  if (!range) return '';
  if (range.period === 'week') return 'Esta semana';
  if (range.period === '30d') return 'Últimos 30 días';
  if (range.period === 'month') return 'Este mes';
  return `${range.from} → ${range.to}`;
}

function PreviewSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SummaryPreview({ data }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PreviewSection title="Clientes">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Total</dt><dd className="font-medium">{data.clients.totalClients}</dd></div>
          <div><dt className="text-text-muted">Activos</dt><dd className="font-medium">{data.clients.activeClients}</dd></div>
          <div><dt className="text-text-muted">Con deuda</dt><dd className="font-medium">{data.clients.clientsWithDebt}</dd></div>
          <div><dt className="text-text-muted">Suspendidos</dt><dd className="font-medium">{data.clients.suspendedClients}</dd></div>
        </dl>
      </PreviewSection>
      <PreviewSection title="Finanzas">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Pagos</dt><dd className="font-medium">{formatCurrency(data.finances.totalPayments)}</dd></div>
          <div><dt className="text-text-muted">Deuda pendiente</dt><dd className="font-medium">{formatCurrency(data.finances.totalDebts)}</dd></div>
          <div><dt className="text-text-muted">Neto</dt><dd className="font-medium">{formatCurrency(data.finances.netCollected)}</dd></div>
          <div><dt className="text-text-muted">Movimientos</dt><dd className="font-medium">{data.finances.totalMovements}</dd></div>
        </dl>
      </PreviewSection>
      <PreviewSection title="Ocupación">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Clases</dt><dd className="font-medium">{data.occupancy.totalClasses}</dd></div>
          <div><dt className="text-text-muted">Ocupación</dt><dd className="font-medium">{data.occupancy.occupancyRate}%</dd></div>
        </dl>
      </PreviewSection>
      <PreviewSection title="Reservas">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Total</dt><dd className="font-medium">{data.reservations.total}</dd></div>
          <div><dt className="text-text-muted">Confirmadas</dt><dd className="font-medium">{data.reservations.confirmed}</dd></div>
          <div><dt className="text-text-muted">Canceladas</dt><dd className="font-medium">{data.reservations.cancelled}</dd></div>
          <div><dt className="text-text-muted">Completadas</dt><dd className="font-medium">{data.reservations.completed}</dd></div>
        </dl>
      </PreviewSection>
    </div>
  );
}

function ClientsPreview({ data }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Por estado">
        <div className="space-y-2 text-sm">
          {data.stats.byStatus.map((item) => (
            <div key={item.status} className="flex justify-between">
              <span>{CLIENT_STATUS_LABELS[item.status] || item.status}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </PreviewSection>
      {data.clientsWithDebt.length > 0 ? (
        <PreviewSection title="Clientes con deuda pendiente">
          <div className="space-y-2 text-sm">
            {data.clientsWithDebt.map((client) => (
              <div key={client.id} className="flex flex-col gap-1 rounded-xl bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{client.fullName}</span>
                <span>
                  Debe {formatCurrency(client.outstandingDebt ?? Math.abs(Math.min(client.balance, 0)))}
                  {' · '}
                  {CLIENT_STATUS_LABELS[client.status] || client.status}
                </span>
              </div>
            ))}
          </div>
        </PreviewSection>
      ) : null}
    </div>
  );
}

function FinancesPreview({ data }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Resumen">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Pagos</dt><dd className="font-medium">{formatCurrency(data.stats.totalPayments)}</dd></div>
          <div><dt className="text-text-muted">Deuda pendiente</dt><dd className="font-medium">{formatCurrency(data.stats.totalDebts)}</dd></div>
          <div><dt className="text-text-muted">Neto</dt><dd className="font-medium">{formatCurrency(data.stats.netCollected)}</dd></div>
        </dl>
      </PreviewSection>
      {data.payments.length > 0 ? (
        <PreviewSection title="Pagos del período">
          <div className="space-y-2 text-sm">
            {data.payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex flex-col gap-1 rounded-xl bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{payment.clientName}</span>
                <span>{formatCurrency(payment.amount)} · {formatDateTime(payment.createdAt)}</span>
              </div>
            ))}
          </div>
        </PreviewSection>
      ) : null}
    </div>
  );
}

function OccupancyPreview({ data }) {
  return (
    <PreviewSection title="Ocupación diaria">
      <div className="space-y-2 text-sm">
        {data.stats.byDay.map((item) => (
          <div key={item.date} className="flex justify-between rounded-xl bg-surface-muted px-3 py-2">
            <span>{formatDate(item.date)}</span>
            <span className="font-medium">{item.booked}/{item.capacity} ({item.occupancyRate}%)</span>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

function ReservationsPreview({ data }) {
  return (
    <PreviewSection title="Reservas por estado">
      <div className="space-y-2 text-sm">
        {data.stats.byStatus.map((item) => (
          <div key={item.status} className="flex justify-between">
            <span>{RESERVATION_STATUS_LABELS[item.status] || item.status}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

function PlansPreview({ data }) {
  return (
    <PreviewSection title="Distribución de planes">
      <div className="space-y-2 text-sm">
        {data.stats.distribution.map((item) => (
          <div key={item.planName} className="flex justify-between">
            <span>{item.planName}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

function SchedulesPreview({ data }) {
  return (
    <PreviewSection title="Horarios más reservados">
      <div className="space-y-2 text-sm">
        {data.items.map((item, index) => (
          <div key={`${item.dayOfWeek}-${item.startTime}-${index}`} className="flex justify-between rounded-xl bg-surface-muted px-3 py-2">
            <span>{DAY_LABELS[item.dayOfWeek]} {item.startTime}</span>
            <span className="font-medium">{item.reservations} reservas</span>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

function RecoveriesPreview({ data }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Resumen">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-text-muted">Total</dt><dd className="font-medium">{data.stats.total}</dd></div>
          <div><dt className="text-text-muted">Disponibles</dt><dd className="font-medium">{data.stats.available}</dd></div>
          <div><dt className="text-text-muted">Usadas</dt><dd className="font-medium">{data.stats.used}</dd></div>
          <div><dt className="text-text-muted">Vencidas</dt><dd className="font-medium">{data.stats.expired}</dd></div>
        </dl>
      </PreviewSection>
      {data.stats.items.length > 0 ? (
        <PreviewSection title="Detalle">
          <div className="space-y-2 text-sm">
            {data.stats.items.slice(0, 10).map((item) => (
              <div key={item.id} className="flex flex-col gap-1 rounded-xl bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{item.clientName}</span>
                <span>{RECOVERY_STATUS_LABELS[item.status] || item.status} · vence {formatDate(item.expiresAt)}</span>
              </div>
            ))}
          </div>
        </PreviewSection>
      ) : null}
    </div>
  );
}

function ReportPreview({ type, data }) {
  switch (type) {
    case 'summary':
      return <SummaryPreview data={data} />;
    case 'clients':
      return <ClientsPreview data={data} />;
    case 'finances':
      return <FinancesPreview data={data} />;
    case 'occupancy':
      return <OccupancyPreview data={data} />;
    case 'reservations':
      return <ReservationsPreview data={data} />;
    case 'plans':
      return <PlansPreview data={data} />;
    case 'schedules':
      return <SchedulesPreview data={data} />;
    case 'recoveries':
      return <RecoveriesPreview data={data} />;
    default:
      return null;
  }
}

function AnalyticsPanel({ period }) {
  const { data, isLoading, isError } = useDashboardOverview({ period });
  const summary = data?.summary;

  const occupancyItems = (data?.occupancy?.byDay || []).map((item) => ({
    date: item.date,
    value: item.occupancyRate,
  }));

  const revenueItems = (data?.finances?.byDay || []).map((item) => ({
    date: item.date,
    value: item.payments,
  }));

  const planItems = (data?.plans?.distribution || []).map((item) => ({
    label: item.planName,
    value: item.count,
  }));

  const clientStatusItems = (data?.clients?.byStatus || []).map((item) => ({
    label: CLIENT_STATUS_LABELS[item.status] || item.status,
    value: item.count,
  }));

  const reservationItems = (data?.reservations?.byStatus || []).map((item) => ({
    label: RESERVATION_STATUS_LABELS[item.status] || item.status,
    value: item.count,
  }));

  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando indicadores...</p>;
  }

  if (isError) {
    return <Alert variant="error">No se pudieron cargar los indicadores del período.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Indicadores del período</h2>
        <p className="mt-1 text-sm text-text-muted">{formatPeriodLabel(data?.range)}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clientes activos"
          value={summary?.activeClients ?? 0}
          hint={`${summary?.totalClients ?? 0} clientes en total`}
          tone="brand"
        />
        <KpiCard
          label="Ocupación"
          value={`${summary?.occupancyRate ?? 0}%`}
          hint={`${summary?.totalBooked ?? 0}/${summary?.totalCapacity ?? 0} cupos`}
        />
        <KpiCard
          label="Cobrado"
          value={formatCurrency(summary?.totalPayments ?? 0)}
          hint={`Neto: ${formatCurrency(summary?.netCollected ?? 0)}`}
          tone="success"
        />
        <KpiCard
          label="Pendientes"
          value={(summary?.pendingReservations ?? 0) + (summary?.pendingScheduleChanges ?? 0)}
          hint={`${summary?.pendingReservations ?? 0} reservas · ${summary?.pendingScheduleChanges ?? 0} cambios`}
          tone="warning"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Planes activos" value={summary?.activePlans ?? 0} hint="Asignaciones vigentes" />
        <KpiCard label="Clases programadas" value={summary?.totalClasses ?? 0} hint="En el período" />
        <KpiCard label="Reservas confirmadas" value={summary?.confirmedReservations ?? 0} />
        <KpiCard
          label="Clientes con deuda"
          value={summary?.clientsWithDebt ?? 0}
          hint={`${summary?.suspendedClients ?? 0} suspendidos`}
          tone={summary?.clientsWithDebt > 0 ? 'danger' : 'default'}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleBarChart
          title="Ocupación diaria (%)"
          items={occupancyItems}
          valueKey="value"
          formatValue={(value) => `${value}%`}
        />
        <SimpleBarChart
          title="Cobros diarios"
          items={revenueItems}
          valueKey="value"
          formatValue={(value) => formatCurrency(value)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SimpleBarChart title="Clientes por estado" items={clientStatusItems} valueKey="value" labelKey="label" />
        <SimpleBarChart title="Reservas por estado" items={reservationItems} valueKey="value" labelKey="label" />
        <SimpleBarChart title="Distribución de planes" items={planItems} valueKey="value" labelKey="label" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="text-base font-semibold text-text">Clases con mayor ocupación</h3>
          {(data?.topClasses || []).length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Sin clases en el período.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.topClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium capitalize text-text">
                      {formatDateDisplay(classItem.classDate)}
                    </p>
                    <p className="text-text-muted">
                      {classItem.startTime} · {classItem.bookedCount}/{classItem.capacity} cupos
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-text">
                    {classItem.occupancyRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="text-base font-semibold text-text">Actividad reciente</h3>
          {(data?.recentActivity || []).length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Sin actividad registrada.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3 text-sm">
                  <p className="font-medium text-text">{item.clientName}</p>
                  <p className="text-text-muted">{item.description}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ReportsPage() {
  const [type, setType] = useState('summary');
  const [period, setPeriod] = useState('month');
  const [feedback, setFeedback] = useState(null);

  const query = { type, period };
  const { data, isLoading, isError } = useReportPreview(query);
  const exportReport = useExportReport();

  async function handleExport(format) {
    setFeedback(null);

    try {
      await exportReport.mutateAsync({ ...query, format });
      setFeedback({
        type: 'success',
        message: `Reporte exportado en formato ${format.toUpperCase()}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo exportar el reporte.'),
      });
    }
  }

  return (
    <AdminLayout
      title="Reportes"
      subtitle="Indicadores del estudio, vista previa y exportación de informes."
    >
      <section className="glass-card p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <Select label="Tipo de reporte" value={type} onChange={(event) => setType(event.target.value)}>
            {REPORT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>

          <Select label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>

          <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exportReport.isPending}>
            Exportar PDF
          </Button>
          <Button onClick={() => handleExport('xlsx')} disabled={exportReport.isPending}>
            Exportar Excel
          </Button>
        </div>

        {feedback ? (
          <Alert variant={feedback.type} className="mt-4">
            {feedback.message}
          </Alert>
        ) : null}
      </section>

      <section className="mt-6 glass-card p-6">
        <AnalyticsPanel period={period} />
      </section>

      <section className="mt-6 glass-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text">{data?.label || 'Vista previa del reporte'}</h2>
          {data?.range ? (
            <p className="mt-1 text-sm text-text-muted">
              Período: {data.range.from} → {data.range.to}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-sm text-text-muted">Cargando vista previa...</p>
        ) : isError ? (
          <Alert variant="error">No se pudo cargar la vista previa del reporte.</Alert>
        ) : data?.data ? (
          <ReportPreview type={type} data={data.data} />
        ) : null}
      </section>
    </AdminLayout>
  );
}
