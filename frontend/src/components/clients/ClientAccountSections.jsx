import { useEffect, useMemo, useState } from 'react';
import CancelPlanModal from './CancelPlanModal';
import ConsumeCatchUpModal from './ConsumeCatchUpModal';
import PlanPaymentModal from './PlanPaymentModal';
import RegisterMovementModal from './RegisterMovementModal';
import RenewPlanModal from './RenewPlanModal';
import WhatsAppPlanExpiryButton from '../notifications/WhatsAppPlanExpiryButton';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import {
  CLIENT_PLAN_STATUS_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_STYLES,
  formatCurrency,
} from '../../constants/plans';
import { PAYMENT_METHOD_LABELS } from '../../constants/finances';
import {
  useAssignPlan,
  useClientPlans,
  usePlansList,
} from '../../hooks/usePlans';
import { useClientFinances } from '../../hooks/useFinances';
import {
  formatDateDisplay,
  formatDateTime,
  getPlanEndDate,
  getTodayInArgentina,
} from '../../lib/dates';
import { getErrorMessage } from '../../lib/formErrors';
import ReceiptActions from '../reports/ReceiptActions';
import WhatsAppDebtNoticeButton from '../notifications/WhatsAppDebtNoticeButton';

function getUsagePercent(used, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100));
}

function UsageMeter({ label, used, limit, remaining }) {
  const percent = getUsagePercent(used, limit);

  return (
    <div className="rounded-xl border border-border/70 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-xs font-medium text-text-muted">{remaining ?? 0} libres</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-text">
        {used ?? 0}
        <span className="text-sm font-medium text-text-muted"> / {limit ?? 0}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-text transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanOptionCard({ plan, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(String(plan.id))}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        selected
          ? 'border-text bg-surface-muted/70 ring-2 ring-text/10'
          : 'border-border bg-white hover:border-text/30 hover:bg-surface-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{plan.name}</p>
          <p className="mt-1 text-base font-semibold text-text">{formatCurrency(plan.price)}</p>
        </div>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-text bg-text text-white' : 'border-border bg-white'
          }`}
          aria-hidden
        >
          {selected ? (
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        {plan.weeklyClasses} sem. · {plan.monthlyClasses} mes · {plan.durationDays} días
      </p>
    </button>
  );
}

export function ClientPlanSection({ clientId, client, onPlanAssigned }) {
  const { data, isLoading } = useClientPlans(clientId);
  const { data: plansData, isLoading: isLoadingPlans } = usePlansList({
    status: 'active',
    page: 1,
    limit: 100,
  });
  const assignPlan = useAssignPlan();

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayInArgentina());
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [consumeCatchUpOpen, setConsumeCatchUpOpen] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [pendingReservationsRedirect, setPendingReservationsRedirect] = useState(null);

  const activePlan = data?.activePlan;
  const renewal = data?.renewal;
  const history = data?.history?.items || [];
  const plans = plansData?.items || [];
  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId));
  const canRenew = Boolean(renewal?.canRenew);
  const inGraceWithoutActive = Boolean(renewal?.inGrace) && !activePlan;

  const previewEndDate = useMemo(() => {
    if (!selectedPlan || !startDate) return '';
    return getPlanEndDate(startDate, selectedPlan);
  }, [selectedPlan, startDate]);

  useEffect(() => {
    if (activePlan) {
      setSelectedPlanId('');
      setCancelModalOpen(false);
    }
  }, [activePlan?.id]);

  const goToReservationsAfterAssign = (message) => {
    if (typeof onPlanAssigned === 'function') {
      onPlanAssigned({ message });
      return;
    }

    setFeedback({ type: 'success', message });
  };

  const handleAssign = async () => {
    if (!selectedPlanId || activePlan) return;

    setFeedback({ type: '', message: '' });

    try {
      const result = await assignPlan.mutateAsync({
        clientId,
        payload: {
          planId: Number(selectedPlanId),
          startDate,
        },
      });

      const plan = selectedPlan;
      setSelectedPlanId('');
      setStartDate(getTodayInArgentina());

      const reservationsMessage =
        'Plan asignado. Ahora podés indicar los horarios fijos del cliente.';

      if (!plan || Number(plan.price) <= 0) {
        goToReservationsAfterAssign(reservationsMessage);
        return;
      }

      setPendingReservationsRedirect(reservationsMessage);
      setPaymentContext({
        client: client || { id: clientId, fullName: 'Cliente' },
        plan,
        clientPlanId: result.clientPlan.id,
        amount: plan.price,
        startDate,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo asignar el plan.'),
      });
    }
  };

  const finishAssignFlow = (message) => {
    const finalMessage =
      message ||
      pendingReservationsRedirect ||
      'Plan asignado. Ahora podés indicar los horarios fijos del cliente.';

    setPaymentContext(null);
    setPendingReservationsRedirect(null);
    goToReservationsAfterAssign(finalMessage);
  };

  const handlePaymentSuccess = (result) => {
    if (result.action === 'pay') {
      const methodLabel =
        PAYMENT_METHOD_LABELS[result.paymentMovement?.paymentMethod] || 'pago registrado';
      setPendingReservationsRedirect(
        `Plan asignado y pagado con ${methodLabel}. Ahora podés indicar los horarios fijos.`
      );
      return;
    }

    if (result.action === 'account') {
      setPendingReservationsRedirect(
        'Plan asignado en cuenta corriente. Ahora podés indicar los horarios fijos.'
      );
      return;
    }

    setPendingReservationsRedirect(
      'Plan asignado. Ahora podés indicar los horarios fijos del cliente.'
    );
  };

  const handleCancelSuccess = (result) => {
    setCancelModalOpen(false);
    setFeedback({
      type: 'success',
      message: result?.message || 'Plan cancelado correctamente.',
    });
  };

  const handleRenewSuccess = (result) => {
    const planName = result?.clientPlan?.planName || renewal?.planName || 'plan';
    const price = Number(result?.clientPlan?.priceSnapshot ?? renewal?.priceSnapshot ?? 0);

    if (price > 0) {
      setPaymentContext({
        client: client || { id: clientId, fullName: 'Cliente' },
        plan: {
          id: result?.clientPlan?.planId || renewal?.planId,
          name: planName,
          price,
        },
        clientPlanId: result.clientPlan.id,
        amount: price,
        startDate: result.clientPlan.startDate,
      });
      setPendingReservationsRedirect(
        'Plan renovado. Los horarios fijos se mantuvieron. Registrá el pago si corresponde.'
      );
      setFeedback({ type: '', message: '' });
      return;
    }

    setFeedback({
      type: 'success',
      message: 'Plan renovado. Los horarios fijos se mantuvieron.',
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Plan del cliente</h2>
          <p className="mt-1 text-sm text-text-muted">
            {activePlan
              ? 'Podés renovar el mismo abono manteniendo los fijos, o cancelarlo para asignar otro.'
              : inGraceWithoutActive
                ? `El plan venció y ya no se puede usar para reservar. Los horarios fijos se retienen ${renewal.graceDaysRemaining} día${
                    renewal.graceDaysRemaining === 1 ? '' : 's'
                  } más (gracia de ${renewal.graceDaysTotal || 7} días) solo para que renueves sin volver a elegirlos.`
                : 'Elegí un plan para habilitar reservas con cupo semanal y mensual.'}
          </p>
        </div>
        {activePlan ? (
          <span className="inline-flex w-fit items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success">
            {CLIENT_PLAN_STATUS_LABELS[activePlan.status] || 'Activo'}
          </span>
        ) : inGraceWithoutActive ? (
          <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            Vencido · {renewal.graceDaysRemaining} día
            {renewal.graceDaysRemaining === 1 ? '' : 's'} de gracia
          </span>
        ) : null}
      </div>

      {feedback.message ? (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'} className="mt-4">
          {feedback.message}
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-text-muted">Cargando plan...</p>
      ) : activePlan ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-border bg-surface-muted/40 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-text shadow-sm">
                  <NavIcon name="plans" className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-text">{activePlan.planName}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {formatDateDisplay(activePlan.startDate)} →{' '}
                    {formatDateDisplay(activePlan.endDate)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {formatCurrency(activePlan.priceSnapshot)}
                    <span className="font-normal text-text-muted"> · vigencia actual</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <WhatsAppPlanExpiryButton
                  clientName={client?.fullName}
                  clientPhone={client?.phone}
                  planName={activePlan.planName}
                  endDate={activePlan.endDate}
                />
                {canRenew ? (
                  <Button variant="secondary" onClick={() => setRenewModalOpen(true)}>
                    Renovar plan
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  className="text-danger hover:bg-red-50"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancelar plan
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <UsageMeter
                label="Esta semana"
                used={activePlan.weeklyClassesUsed}
                limit={activePlan.weeklyClassesLimit}
                remaining={activePlan.availability?.weeklyRemaining}
              />
              <UsageMeter
                label="Cupo del plan"
                used={activePlan.monthlyClassesUsed}
                limit={activePlan.monthlyClassesLimit}
                remaining={activePlan.availability?.monthlyRemaining}
              />
            </div>

            <div className="mt-3 rounded-xl border border-border bg-surface-muted/40 px-4 py-3 text-sm text-text-muted">
              Cancelaciones con devolución de cupo:{' '}
              <span className="font-semibold text-text">
                {activePlan.availability?.cancellationsUsed ?? 0}/
                {activePlan.availability?.cancellationsLimit ?? 5}
              </span>
              {Number(activePlan.availability?.cancellationsRemaining ?? 5) <= 0
                ? ' · sin cancelaciones disponibles en este abono'
                : ` · quedan ${activePlan.availability?.cancellationsRemaining ?? 5}`}
              .
            </div>

            {Number(activePlan.availability?.catchUpSlots || activePlan.catchUpSlots || 0) > 0 ? (
              <div className="space-y-3">
                <Alert variant="info">
                  Tiene {activePlan.availability?.catchUpSlots || activePlan.catchUpSlots} clase(s) de
                  recuperación (catch-up): el plan esperaba{' '}
                  {activePlan.availability?.expectedUsed ?? '—'} usadas a esta altura y lleva{' '}
                  {activePlan.monthlyClassesUsed}. Eso le permite reservar días extra sin haber
                  cancelado. Detalle en el tab Historial.
                </Alert>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setConsumeCatchUpOpen(true)}
                >
                  Descontar recuperación usada
                </Button>
              </div>
            ) : null}

            <Alert variant="info">
              Para asignar un plan distinto, cancelá el actual (se liberan los fijos). Si es el
              mismo abono, usá Renovar para mantener los horarios.
            </Alert>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {inGraceWithoutActive ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">
                    Plan vencido: {renewal.planName}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Finalizó el {formatDateDisplay(renewal.endDate)}. El abono ya no se puede usar
                    para reservar. Los horarios fijos se retienen {renewal.graceDaysRemaining} día
                    {renewal.graceDaysRemaining === 1 ? '' : 's'} más
                    {renewal.graceEndsOn
                      ? ` (hasta el ${formatDateDisplay(renewal.graceEndsOn)})`
                      : ''}{' '}
                    para que renueves el mismo plan sin reconfigurarlos. Si no renovás, se liberan
                    solos al terminar la gracia.
                  </p>
                </div>
                <Button onClick={() => setRenewModalOpen(true)} className="shrink-0">
                  Renovar mismo plan
                </Button>
              </div>
              <Alert variant="info" className="mt-4">
                Si asignás otro plan distinto, se liberan los horarios fijos del abono anterior.
              </Alert>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-text">
                  <NavIcon name="plans" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Sin plan activo</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Seleccioná un plan con las mini cards y confirmá la asignación.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-semibold text-text">
              {inGraceWithoutActive ? 'O asigná otro plan' : 'Elegí un plan'}
            </p>
            {isLoadingPlans ? (
              <p className="text-sm text-text-muted">Cargando planes...</p>
            ) : plans.length === 0 ? (
              <Alert variant="info">
                No hay planes activos disponibles. Creá uno desde Configuración → Planes.
              </Alert>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => (
                  <PlanOptionCard
                    key={plan.id}
                    plan={plan}
                    selected={String(plan.id) === String(selectedPlanId)}
                    onSelect={setSelectedPlanId}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedPlan ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-surface-muted/30 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Inicio del plan"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <div>
                  <p className="mb-1.5 text-sm font-medium text-text">Fin estimado</p>
                  <div className="flex h-11 items-center rounded-xl border border-border bg-white px-3 text-sm text-text">
                    {previewEndDate ? formatDateDisplay(previewEndDate) : '-'}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleAssign}
                isLoading={assignPlan.isPending}
                disabled={!selectedPlanId || !startDate}
                className="w-full lg:min-w-[180px]"
              >
                Asignar plan
              </Button>
            </div>
          ) : null}

          <p className="text-sm text-text-muted">
            Después de asignar, podés registrar el pago o cargarlo a cuenta corriente.
          </p>
        </div>
      )}

      {history.length > 0 ? (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-text">Historial de planes</h3>
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{item.planName}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatDateDisplay(item.startDate)} → {formatDateDisplay(item.endDate)} ·{' '}
                    {formatCurrency(item.priceSnapshot)}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    item.status === 'active'
                      ? 'border-emerald-100 bg-emerald-50 text-success'
                      : item.status === 'cancelled'
                        ? 'border-red-100 bg-red-50 text-danger'
                        : 'border-border bg-white text-text-muted'
                  }`}
                >
                  {CLIENT_PLAN_STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CancelPlanModal
        open={cancelModalOpen}
        plan={activePlan}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
      />

      <RenewPlanModal
        open={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        clientId={clientId}
        renewal={renewal}
        client={client}
        onRenewed={handleRenewSuccess}
      />

      <ConsumeCatchUpModal
        open={consumeCatchUpOpen}
        onClose={() => setConsumeCatchUpOpen(false)}
        plan={activePlan}
        onSuccess={(result) => {
          setFeedback({
            type: 'success',
            message: result?.message || 'Cupos de recuperación descontados.',
          });
        }}
      />

      <PlanPaymentModal
        open={Boolean(paymentContext)}
        context={paymentContext}
        onClose={() => {
          if (!paymentContext) return;
          finishAssignFlow();
        }}
        onSuccess={handlePaymentSuccess}
      />
    </section>
  );
}

export function ClientFinanceSection({ clientId, clientPhone, clientName }) {
  const { data, isLoading } = useClientFinances(clientId, { page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorFeedback, setErrorFeedback] = useState('');

  const summary = data?.summary;
  const movements = data?.movements?.items || [];
  const outstandingDebt = Number(summary?.outstandingDebt ?? 0);
  const hasDebt = outstandingDebt > 0;

  useEffect(() => {
    if (!feedback && !errorFeedback) return undefined;
    const timer = window.setTimeout(() => {
      setFeedback('');
      setErrorFeedback('');
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [feedback, errorFeedback]);

  return (
    <section className="glass-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Cuenta corriente</h2>
          <p className="mt-1 text-sm text-text-muted">
            Resumen, historial y registro de pagos o ajustes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
          {hasDebt ? (
            <WhatsAppDebtNoticeButton
              clientName={clientName}
              clientPhone={clientPhone}
              debtAmount={outstandingDebt}
              onError={setErrorFeedback}
            />
          ) : null}
          <Button onClick={() => setModalOpen(true)} className="w-full shrink-0 sm:w-auto">
            Registrar movimiento
          </Button>
        </div>
      </div>

      {feedback ? (
        <Alert variant="success" className="mt-4">
          {feedback}
        </Alert>
      ) : null}
      {errorFeedback ? (
        <Alert variant="error" className="mt-4">
          {errorFeedback}
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando finanzas...</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-xs text-text-muted">Saldo actual</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  summary?.balance < 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {formatCurrency(summary?.balance)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-xs text-text-muted">Pagos</p>
              <p className="mt-1 font-medium">{formatCurrency(summary?.totalPayments)}</p>
            </div>
            <div
              className={`rounded-xl p-4 ${
                hasDebt ? 'border border-red-100 bg-red-50/60' : 'bg-surface-muted'
              }`}
            >
              <p className="text-xs text-text-muted">Deuda pendiente</p>
              <p className={`mt-1 font-medium ${hasDebt ? 'text-danger' : 'text-text'}`}>
                {formatCurrency(outstandingDebt)}
              </p>
              {hasDebt ? (
                <p className="mt-2 text-[11px] text-text-muted">
                  Podés enviarle un recordatorio por WhatsApp.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-xs text-text-muted">Movimientos</p>
              <p className="mt-1 font-medium">{summary?.totalMovements || 0}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-sm font-semibold text-text">Historial financiero</h3>
              {movements.length > 0 ? (
                <p className="text-xs text-text-muted">{movements.length} movimientos</p>
              ) : null}
            </div>

            {movements.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">Sin movimientos registrados.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/60 text-[11px] uppercase tracking-wide text-text-muted">
                        <th className="whitespace-nowrap px-4 py-3 font-medium">Fecha</th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">Tipo</th>
                        <th className="min-w-48 px-4 py-3 font-medium">Detalle</th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">Método</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Monto</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Saldo</th>
                        <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-b border-border/60 last:border-b-0 transition hover:bg-surface-muted/40"
                        >
                          <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-text-muted">
                            {formatDateTime(movement.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle">
                            <span
                              className={`inline-flex rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium ${MOVEMENT_TYPE_STYLES[movement.type]}`}
                            >
                              {MOVEMENT_TYPE_LABELS[movement.type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <p className="max-w-xs truncate text-text" title={movement.description || ''}>
                              {movement.description || '—'}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-text-muted">
                            {movement.paymentMethod
                              ? PAYMENT_METHOD_LABELS[movement.paymentMethod]
                              : '—'}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 align-middle text-right font-medium tabular-nums ${MOVEMENT_TYPE_STYLES[movement.type]}`}
                          >
                            {formatCurrency(movement.amount)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle text-right text-xs tabular-nums text-text-muted">
                            {formatCurrency(movement.balanceAfter)}
                          </td>
                          <td className="px-3 py-2 align-middle text-right">
                            {movement.type === 'payment' ? (
                              <ReceiptActions
                                movementId={movement.id}
                                clientPhone={clientPhone}
                              />
                            ) : (
                              <span className="inline-block w-24 text-center text-xs text-text-muted/50">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <RegisterMovementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={clientId}
        currentBalance={summary?.balance ?? 0}
        onSuccess={() => setFeedback('Movimiento registrado correctamente.')}
      />
    </section>
  );
}
