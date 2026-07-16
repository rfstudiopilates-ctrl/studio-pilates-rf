import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import NavIcon from '../ui/NavIcon';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../constants/finances';
import { formatCurrency } from '../../constants/plans';
import { usePublicSettings, useAdminSettings } from '../../hooks/useSettings';
import { usePlanDetail } from '../../hooks/usePlans';
import { useCancelReservation, useConfirmReservation } from '../../hooks/useReservations';
import { formatDateDisplay } from '../../lib/dates';
import {
  buildWhatsAppMessage,
  formatWhatsAppNumber,
  openWhatsApp,
} from '../../lib/whatsapp';
import { DEFAULT_WHATSAPP_MESSAGES } from '../../constants/settings';
import { getErrorMessage } from '../../lib/formErrors';

const STEPS = [
  { id: 1, label: 'Contactar', hint: 'WhatsApp' },
  { id: 2, label: 'Confirmar seña', hint: 'Plan y pago' },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface-muted/40 p-1">
      {STEPS.map((step) => {
        const isActive = currentStep === step.id;
        const isDone = currentStep > step.id;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
              isActive ? 'bg-white shadow-sm' : ''
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                isDone
                  ? 'bg-emerald-100 text-emerald-800'
                  : isActive
                    ? 'bg-text text-white'
                    : 'bg-white text-text-muted'
              }`}
            >
              {isDone ? '✓' : step.id}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-semibold ${
                  isActive || isDone ? 'text-text' : 'text-text-muted'
                }`}
              >
                {step.label}
              </p>
              <p className="truncate text-[10px] text-text-muted">{step.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReservationSummary({ reservation, compact = false }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface-muted/40 ${
        compact ? 'px-3 py-2.5' : 'p-3.5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100">
          <NavIcon name="user" className="h-4 w-4 text-text" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{reservation.clientName}</p>
          <p className="mt-0.5 text-xs capitalize text-text-muted">
            {formatDateDisplay(reservation.classDate)} · {reservation.startTime}
            {reservation.endTime ? ` – ${reservation.endTime}` : ''}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Tel: {reservation.clientPhone?.trim() || 'No cargado'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GuestReservationConfirmModal({
  open,
  reservation,
  onClose,
  onSuccess,
}) {
  const confirmReservation = useConfirmReservation();
  const cancelReservation = useCancelReservation();
  const { data: publicSettings } = usePublicSettings();
  const { data: adminSettings } = useAdminSettings();
  const dropInPlanId = adminSettings?.dropInPlanId || null;
  const { data: dropInPlan, isLoading: isLoadingPlan } = usePlanDetail(dropInPlanId);

  const [step, setStep] = useState(1);
  const [depositAmount, setDepositAmount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [depositInitialized, setDepositInitialized] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDepositAmount(null);
    setPaymentMethod('transfer');
    setNotes('');
    setError('');
    setWhatsappOpened(false);
    setDepositInitialized(false);
  }, [open, reservation?.id]);

  useEffect(() => {
    if (!open || depositInitialized || !dropInPlan) return;
    setDepositAmount(Number(dropInPlan.price) || 0);
    setDepositInitialized(true);
  }, [open, dropInPlan, depositInitialized]);

  const phoneDigits = formatWhatsAppNumber(reservation?.clientPhone);
  const hasPhone = phoneDigits.length >= 6;
  const studioName = publicSettings?.studioName || adminSettings?.studioName || 'Studio Pilates RF';
  const guestTemplate =
    adminSettings?.whatsappMessages?.guestDropInOffer?.trim() ||
    DEFAULT_WHATSAPP_MESSAGES.guestDropInOffer;
  const isBusy = confirmReservation.isPending || cancelReservation.isPending;
  const planPrice = Number(dropInPlan?.price || 0);
  const depositValue = Number(depositAmount ?? 0);
  const remainingDebt = Math.max(0, Number((planPrice - depositValue).toFixed(2)));
  const creditOverpay = Math.max(0, Number((depositValue - planPrice).toFixed(2)));

  const previewMessage = useMemo(() => {
    if (!reservation) return '';

    return buildWhatsAppMessage(guestTemplate, {
      nombre: reservation.clientName?.split(' ')?.[0] || reservation.clientName || 'hola',
      fecha: formatDateDisplay(reservation.classDate),
      hora: reservation.startTime,
      estudio: studioName,
    });
  }, [reservation, studioName, guestTemplate]);

  const handleClose = () => {
    if (isBusy) return;
    onClose?.();
  };

  const handleOpenWhatsApp = () => {
    setError('');

    if (!hasPhone) {
      setError('Este cliente no tiene un teléfono cargado para WhatsApp.');
      return;
    }

    try {
      openWhatsApp({ phone: phoneDigits, message: previewMessage });
      setWhatsappOpened(true);
    } catch (openError) {
      setError(getErrorMessage(openError, 'No se pudo abrir WhatsApp.'));
    }
  };

  const goToStep2 = () => {
    setError('');

    if (!dropInPlanId || !dropInPlan) {
      setError(
        'No hay un plan configurado para clases puntuales. Definilo en Configuración → Operación.'
      );
      return;
    }

    setStep(2);
  };

  const handleConfirmWithDeposit = async () => {
    setError('');
    const amount = Number(depositAmount ?? 0);

    if (Number.isNaN(amount) || amount < 0) {
      setError('Indicá un monto de seña válido (puede ser 0 si va todo a cuenta).');
      return;
    }

    if (amount > 0 && !paymentMethod) {
      setError('Seleccioná el método de pago de la seña.');
      return;
    }

    if (!dropInPlanId) {
      setError('Falta configurar el plan de clase puntual en Configuración.');
      return;
    }

    try {
      const result = await confirmReservation.mutateAsync({
        id: reservation.id,
        payload: {
          depositAmount: amount,
          paymentMethod: amount > 0 ? paymentMethod : undefined,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'No se pudo confirmar la solicitud.'));
    }
  };

  const handleReject = async () => {
    if (
      !window.confirm(
        `¿Rechazar la solicitud de ${reservation.clientName}? Se libera el cupo del turno.`
      )
    ) {
      return;
    }

    setError('');

    try {
      await cancelReservation.mutateAsync({
        id: reservation.id,
        payload: { cancellationReason: 'Solicitud de clase puntual rechazada' },
      });
      onSuccess?.({ rejected: true });
      onClose?.();
    } catch (rejectError) {
      setError(getErrorMessage(rejectError, 'No se pudo rechazar la solicitud.'));
    }
  };

  if (!reservation) {
    return null;
  }

  const modalTitle = step === 1 ? 'Contactar al cliente' : 'Plan, seña y confirmación';
  const modalDescription =
    step === 1
      ? 'Avisá por WhatsApp y coordiná la seña.'
      : 'Se asigna el plan puntual: lo cobrado es la seña y el resto queda en cuenta corriente.';

  const footer = (
    <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        className="w-full text-danger sm:w-auto"
        onClick={handleReject}
        isLoading={cancelReservation.isPending}
        disabled={confirmReservation.isPending}
      >
        Rechazar
      </Button>

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        {step === 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={handleClose}
              disabled={isBusy}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={goToStep2}
              disabled={isBusy || isLoadingPlan}
            >
              {whatsappOpened || !hasPhone ? 'Continuar a la seña' : 'Ya contacté · Continuar'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setError('');
                setStep(1);
              }}
              disabled={isBusy}
            >
              Volver
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleConfirmWithDeposit}
              isLoading={confirmReservation.isPending}
              disabled={cancelReservation.isPending || !dropInPlan}
            >
              Confirmar turno
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={modalTitle}
      description={modalDescription}
      size="xl"
      footer={footer}
    >
      <div className="space-y-4">
        <StepIndicator currentStep={step} />

        {error ? (
          <Alert variant="error" className="py-2 text-sm">
            {error}
          </Alert>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <ReservationSummary reservation={reservation} />

              {!hasPhone ? (
                <Alert variant="error" className="py-2 text-sm">
                  Falta el teléfono. Podés continuar si ya lo contactaste por otro medio.
                </Alert>
              ) : null}

              {whatsappOpened ? (
                <Alert variant="success" className="py-2 text-sm">
                  WhatsApp abierto. Cuando paguen la seña, continuá al siguiente paso.
                </Alert>
              ) : null}

              <p className="text-xs text-text-muted">
                El cupo queda aparte mientras esperás la seña. Podés cerrar y volver después.
              </p>

              <Button
                type="button"
                className="w-full"
                onClick={handleOpenWhatsApp}
                disabled={!hasPhone || isBusy}
              >
                {whatsappOpened ? 'Abrir WhatsApp de nuevo' : 'Abrir WhatsApp'}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-white p-3.5 lg:min-h-[13.5rem]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Mensaje a enviar
              </p>
              <pre className="mt-2 wrap-anywhere whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
                {previewMessage}
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="space-y-3">
              <ReservationSummary reservation={reservation} compact />

              {isLoadingPlan ? (
                <p className="text-sm text-text-muted">Cargando plan configurado...</p>
              ) : !dropInPlan ? (
                <Alert variant="error" className="py-2 text-sm">
                  Configurá el plan de clase puntual en Configuración → Operación.
                </Alert>
              ) : (
                <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Plan a asignar
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text">{dropInPlan.name}</p>
                  <p className="mt-0.5 text-sm text-text">
                    Precio: <span className="font-semibold">{formatCurrency(planPrice)}</span>
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {dropInPlan.durationDays} días · {dropInPlan.weeklyClasses} clase
                    {dropInPlan.weeklyClasses === 1 ? '' : 's'}/sem · {dropInPlan.monthlyClasses}{' '}
                    /mes
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface-muted/40 px-3.5 py-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Cuenta corriente
                </p>
                <dl className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Valor del plan</dt>
                    <dd className="font-medium text-text">{formatCurrency(planPrice)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Seña / pago ahora</dt>
                    <dd className="font-medium text-text">
                      {formatCurrency(Number.isNaN(depositValue) ? 0 : depositValue)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-1.5">
                    <dt className="font-medium text-text">
                      {creditOverpay > 0 ? 'A favor' : 'Queda en cuenta'}
                    </dt>
                    <dd
                      className={`font-semibold ${
                        remainingDebt > 0
                          ? 'text-danger'
                          : creditOverpay > 0
                            ? 'text-success'
                            : 'text-text'
                      }`}
                    >
                      {formatCurrency(remainingDebt > 0 ? remainingDebt : creditOverpay)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <CurrencyInput
                  label="Seña cobrada"
                  value={depositAmount}
                  onValueChange={setDepositAmount}
                  allowZero
                  placeholder="0,00"
                />
                <Select
                  label="Método de pago"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={depositValue <= 0}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Nota (opcional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: Transferencia parcial, saldo a pagar en estudio"
              />

              <p className="text-xs text-text-muted">
                Si la seña es menor al plan, el resto queda como deuda en la cuenta corriente del
                cliente. Si es 0, el plan completo va a cuenta.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
