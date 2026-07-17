import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { useVapidPublicKey } from '../../hooks/useNotifications';
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
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  const supported = isPushSupported();
  const pushConfigured = Boolean(vapid?.enabled);

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

  if (permission === 'granted' && subscribed && !status) {
    return null;
  }

  async function handleEnable() {
    setStatus(null);
    setLoading(true);

    try {
      await subscribeToPushNotifications();
      setSubscribed(true);
      setPermission('granted');
      setStatus({
        type: 'success',
        message: 'Notificaciones push activadas en este dispositivo.',
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

  const isDenied = permission === 'denied';
  const needsResubscribe = permission === 'granted' && !subscribed;

  return (
    <div className={className}>
      {permission !== 'granted' || !subscribed ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-text">{title}</p>
            <p className="mt-1 text-sm text-text-muted">
              {needsResubscribe
                ? 'El permiso ya está dado, pero este dispositivo todavía no está vinculado. Completá la activación para recibir avisos.'
                : description}
            </p>
          </div>
          <Button onClick={handleEnable} disabled={loading || isDenied}>
            {loading
              ? 'Activando...'
              : needsResubscribe
                ? 'Completar activación'
                : 'Activar notificaciones'}
          </Button>
        </div>
      ) : null}

      {isDenied ? (
        <p className="mt-2 text-sm text-danger">
          Las notificaciones están bloqueadas en el navegador. Habilitalas desde la configuración del sitio
          y volvé a intentar.
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
