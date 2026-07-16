import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import KpiCard from '../../../components/dashboard/KpiCard';
import CollectionsBreakdownModal from '../../../components/finances/CollectionsBreakdownModal';
import DebtorsDetailModal from '../../../components/finances/DebtorsDetailModal';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import NavIcon from '../../../components/ui/NavIcon';
import { Select } from '../../../components/ui/Select';
import {
  FINANCE_PERIOD_PRESETS,
  PAYMENT_METHOD_LABELS,
  getFinanceDateRange,
} from '../../../constants/finances';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_STYLES, formatCurrency } from '../../../constants/plans';
import { formatDateTime, formatWeekRange } from '../../../lib/dates';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useFinanceMovements, useFinanceOverview } from '../../../hooks/useFinances';

const MOVEMENT_TYPES = ['payment', 'debt', 'credit', 'debit'];

export default function FinancesPage() {
  const [period, setPeriod] = useState('month');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [debtorsModalOpen, setDebtorsModalOpen] = useState(false);
  const [collectionsModalOpen, setCollectionsModalOpen] = useState(false);

  const historySectionRef = useRef(null);

  const debouncedSearch = useDebouncedValue(search, 350);
  const dateRange = useMemo(() => getFinanceDateRange(period), [period]);

  const overviewParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
    }),
    [dateRange]
  );

  const movementsParams = useMemo(
    () => ({
      page,
      limit: 15,
      q: debouncedSearch.trim() || undefined,
      type: typeFilter || undefined,
      paymentMethod: paymentMethodFilter || undefined,
      from: dateRange.from,
      to: dateRange.to,
    }),
    [page, debouncedSearch, typeFilter, paymentMethodFilter, dateRange]
  );

  const { data: overview, isLoading: isLoadingOverview, isError: isOverviewError } =
    useFinanceOverview(overviewParams);
  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    isFetching: isFetchingMovements,
    isError: isMovementsError,
  } = useFinanceMovements(movementsParams);

  const totals = overview?.totals;
  const debtors = overview?.debtors || [];
  const byPaymentMethod = overview?.byPaymentMethod || [];
  const movements = movementsData?.items || [];
  const pagination = movementsData?.pagination;

  const outstandingTotal = Number(totals?.outstandingDebtTotal ?? totals?.totalDebts ?? 0);
  const periodLabel =
    FINANCE_PERIOD_PRESETS.find((option) => option.value === period)?.label || '';

  const openDebtorsDetail = () => {
    setDebtorsModalOpen(true);
  };

  const openCollectionsDetail = () => {
    setCollectionsModalOpen(true);
  };

  const openDebtHistory = () => {
    setTypeFilter('debt');
    setPage(1);
    window.requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const filterHistoryByMethod = (method) => {
    setPaymentMethodFilter(method);
    setTypeFilter('payment');
    setPage(1);
    window.requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <AdminLayout
      title="Finanzas"
      subtitle="Cobros, cuenta corriente, historial global y métricas del período."
    >
      <section className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-white via-white to-brand-50/50 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-text">
              <NavIcon name="calendar" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text">Período de análisis</h2>
              <p className="mt-0.5 text-sm text-text-muted">
                {dateRange.from && dateRange.to
                  ? formatWeekRange(dateRange.from, dateRange.to)
                  : 'Todo el historial disponible'}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Seleccionar período"
            className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-muted/70 p-1 sm:inline-grid sm:grid-cols-4"
          >
            {FINANCE_PERIOD_PRESETS.map((option) => {
              const isActive = period === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setPeriod(option.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-text shadow-sm ring-1 ring-border'
                      : 'text-text-muted hover:bg-white/60 hover:text-text'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {isOverviewError ? (
        <Alert variant="error" className="mt-6">
          No se pudieron cargar las métricas financieras. Si actualizaste la app recientemente,
          ejecutá la migración <code className="text-xs">002_add_payment_method.sql</code>.
        </Alert>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total cobrado"
            value={isLoadingOverview ? '...' : formatCurrency(totals?.totalPayments)}
            hint={
              totals?.totalRefunds
                ? `Neto tras devoluciones (${formatCurrency(totals.totalRefunds)}) · ver desglose`
                : 'Tocá para ver desglose por método'
            }
            tone="success"
            onClick={openCollectionsDetail}
          />
          <KpiCard
            label="Deuda pendiente"
            value={isLoadingOverview ? '...' : formatCurrency(outstandingTotal)}
            hint={
              isLoadingOverview
                ? 'Saldo pendiente actual'
                : `${debtors.length} cliente${debtors.length === 1 ? '' : 's'} · ver detalle`
            }
            tone="warning"
            onClick={openDebtorsDetail}
          />
          <KpiCard
            label="Clientes con deuda"
            value={isLoadingOverview ? '...' : totals?.clientsWithDebt ?? debtors.length}
            hint="Tocá para ver quiénes y cuánto deben"
            tone="danger"
            onClick={openDebtorsDetail}
          />
          <KpiCard
            label="Movimientos"
            value={isLoadingOverview ? '...' : totals?.totalMovements ?? 0}
            hint={`${totals?.clientsWithMovements ?? 0} clientes con actividad`}
            tone="brand"
            onClick={() => {
              historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      )}

      <section
        ref={historySectionRef}
        id="historial-movimientos"
        className="mt-6 scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="wallet" className="h-5 w-5 text-text" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Historial global</h2>
              <p className="text-sm text-text-muted">
                {isLoadingMovements
                  ? 'Cargando...'
                  : `${pagination?.total ?? 0} movimiento${pagination?.total === 1 ? '' : 's'}`}
                {isFetchingMovements && !isLoadingMovements ? ' · Actualizando' : ''}
                {typeFilter === 'debt'
                  ? ' · Mostrando solo cargos (deuda generada; no es el saldo pendiente)'
                  : ''}
                {paymentMethodFilter
                  ? ` · ${PAYMENT_METHOD_LABELS[paymentMethodFilter] || paymentMethodFilter}`
                  : ''}
              </p>
            </div>
          </div>
          {typeFilter === 'debt' || paymentMethodFilter ? (
            <Button
              variant="secondary"
              onClick={() => {
                setTypeFilter('');
                setPaymentMethodFilter('');
                setPage(1);
              }}
            >
              Quitar filtros
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Buscar"
            placeholder="Cliente o descripción..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Tipo"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {MOVEMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {MOVEMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          <Select
            label="Método de pago"
            value={paymentMethodFilter}
            onChange={(event) => {
              setPaymentMethodFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {isMovementsError ? (
          <Alert variant="error" className="mt-4">
            No se pudo cargar el historial de movimientos. Verificá que la migración de base de
            datos esté aplicada.
          </Alert>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[880px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-muted/90">
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Fecha
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Cliente
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Tipo
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Método
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Descripción
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Monto
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-text-muted">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-text-muted">
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-brand-50/30">
                    <td className="px-3 py-3 text-xs text-text-muted sm:text-sm">
                      {formatDateTime(movement.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <Link
                        to={`/admin/clientes/${movement.clientId}`}
                        className="font-medium text-text hover:underline"
                      >
                        {movement.clientName}
                      </Link>
                      <p className="text-xs text-text-muted">@{movement.clientUsername}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-sm font-medium ${MOVEMENT_TYPE_STYLES[movement.type]}`}>
                        {MOVEMENT_TYPE_LABELS[movement.type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-text-muted">
                      {movement.paymentMethod
                        ? PAYMENT_METHOD_LABELS[movement.paymentMethod]
                        : '—'}
                    </td>
                    <td className="max-w-[16rem] px-3 py-3 text-sm text-text-muted">
                      <span className="line-clamp-2">{movement.description}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-text">
                      {formatCurrency(movement.amount)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-text-muted">
                      {formatCurrency(movement.balanceAfter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">
              Página {pagination.page} de {pagination.totalPages}
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
      </section>

      <CollectionsBreakdownModal
        open={collectionsModalOpen}
        onClose={() => setCollectionsModalOpen(false)}
        byPaymentMethod={byPaymentMethod}
        totalPayments={Number(totals?.totalPayments || 0)}
        totalGrossPayments={Number(totals?.totalGrossPayments || 0)}
        totalRefunds={Number(totals?.totalRefunds || 0)}
        isLoading={isLoadingOverview}
        periodLabel={periodLabel}
        onFilterByMethod={filterHistoryByMethod}
      />

      <DebtorsDetailModal
        open={debtorsModalOpen}
        onClose={() => setDebtorsModalOpen(false)}
        debtors={debtors}
        outstandingTotal={outstandingTotal}
        isLoading={isLoadingOverview}
        onViewDebtHistory={openDebtHistory}
      />
    </AdminLayout>
  );
}
