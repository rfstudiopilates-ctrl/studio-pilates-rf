import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  useSendTestPush,
  usePushStatus,
  useVapidPublicKey,
} from '../../hooks/useNotifications';
import {
  getNotificationPermission,
  hasActivePushSubscription,
  isPushSupported,
  subscribeToPushNotifications,
} from '../../lib/pushNotifications';
import { getErrorMessage } from '../../lib/formErrors';

export default function PushNotificationBanner({
  className = '',
  title = 'Activá las notificaciones push',
  description = 'Recibí en este dispositivo avisos de reservas, cancelaciones y solicitudes de clientes.',
}) {
  const { data: vapid } = useVapidPublicKey();
  const { data: pushStatus, refetch: refetchPushStatus } = usePushStatus();
  const sendTestPush = useSendTestPush();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  const supported = isPushSupported();
  const pushConfigured = Boolean(vapid?.enabled);
  const serverDeviceCount = Number(pushStatus?.deviceCount || 0);

  useEffect(() => {
    let cancelled = false;

    async function refreshSubscriptionState() {
      setChecking(true);
      try {
        const active = await hasActivePushSubscription();
        if (!cancelled) {
          setSubscribed(active);
          setPermission(getNotificationPermission());
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    refreshSubscriptionState();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!supported || !pushConfigured || checking) {
    return null;
  }

  const isDenied = permission === 'denied';
  const needsActivation = permission !== 'granted' || !subscribed;
  const isReady = permission === 'granted' && subscribed;

  async function handleEnable() {
    setStatus(null);
    setLoading(true);

    try {
      await subscribeToPushNotifications();
      setSubscribed(true);
      setPermission('granted');
      await refetchPushStatus();
      setStatus({
        type: 'success',
        message:
          'Notificaciones push activadas en este dispositivo. Probá con el botón de abajo y bloqueá el teléfono.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getErrorMessage(error, 'No se pudieron activar las notificaciones.'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setStatus(null);

    try {
      // Reasegurar suscripción de ESTE contexto (PWA vs Safari en iPhone).
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        setSubscribed(true);
      }

      const result = await sendTestPush.mutateAsync();
      setStatus({
        type: 'success',
        message:
          result?.message ||
          'Prueba enviada. Bloqueá el iPhone: deberías ver la notificación del sistema.',
      });
      await refetchPushStatus();
    } catch (error) {
      setStatus({
        type: 'error',
        message: getErrorMessage(
          error,
          'No se pudo enviar la prueba. Activá las notificaciones en la app instalada (PWA) y reintentá.'
        ),
      });
    }
  }

  return (
    <div className={className}>
      {needsActivation ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-text">{title}</p>
            <p className="mt-1 text-sm text-text-muted">
              {permission === 'granted' && !subscribed
                ? 'El permiso ya está dado, pero este dispositivo todavía no está vinculado. Completá la activación desde la app instalada (no desde Safari).'
                : `${description} En iPhone tenés que hacerlo desde la app agregada a inicio.`}
            </p>
          </div>
          <Button onClick={handleEnable} disabled={loading || isDenied}>
            {loading
              ? 'Activando...'
              : permission === 'granted' && !subscribed
                ? 'Completar activación'
                : 'Activar notificaciones'}
          </Button>
        </div>
      ) : null}

      {isReady ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-text">Push activo en este dispositivo</p>
            <p className="mt-1 text-sm text-text-muted">
              {serverDeviceCount > 0
                ? `${serverDeviceCount} dispositivo${serverDeviceCount === 1 ? '' : 's'} vinculado${serverDeviceCount === 1 ? '' : 's'} a tu cuenta.`
                : 'Permiso local OK. Si no te llegan avisos, tocá “Probar notificación”.'}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={sendTestPush.isPending}
          >
            {sendTestPush.isPending ? 'Enviando…' : 'Probar notificación'}
          </Button>
        </div>
      ) : null}

      {isDenied ? (
        <p className="mt-2 text-sm text-danger">
          Las notificaciones están bloqueadas. En iPhone: Ajustes → Notificaciones → Studio Pilates RF →
          permitir avisos. Después volvé a abrir la app instalada y activá de nuevo.
        </p>
      ) : null}

      {status ? (
        <Alert variant={status.type} className="mt-3">
          {status.message}
        </Alert>
      ) : null}
    </div>
  );
}
