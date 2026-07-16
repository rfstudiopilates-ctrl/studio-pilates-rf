import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import NavIcon from '../ui/NavIcon';
import { useUpdateClient } from '../../hooks/useClients';
import { useAdminSettings } from '../../hooks/useSettings';
import {
  buildWhatsAppMessage,
  formatWhatsAppNumber,
  openWhatsApp,
} from '../../lib/whatsapp';
import { DEFAULT_WHATSAPP_MESSAGES } from '../../constants/settings';
import { getErrorMessage } from '../../lib/formErrors';

function generatePassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export default function SendCredentialsWhatsAppModal({
  open,
  onClose,
  client,
  password: initialPassword = '',
  mode = 'created',
}) {
  const isResend = mode === 'resend';
  const updateClient = useUpdateClient();
  const { data: settings } = useAdminSettings();

  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError('');
    setSent(false);
    setPasswordUpdated(false);
    setShowPassword(isResend);
    setPassword(isResend ? generatePassword() : initialPassword || '');
  }, [open, client?.id, isResend, initialPassword]);

  const phoneDigits = formatWhatsAppNumber(client?.phone);
  const hasPhone = phoneDigits.length >= 6;
  const studioName = settings?.studioName || 'Studio Pilates RF';
  const loginUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
  const credentialsTemplate =
    (isResend
      ? settings?.whatsappMessages?.credentialsResend
      : settings?.whatsappMessages?.credentialsCreated
    )?.trim() ||
    (isResend
      ? DEFAULT_WHATSAPP_MESSAGES.credentialsResend
      : DEFAULT_WHATSAPP_MESSAGES.credentialsCreated);

  const previewMessage = useMemo(() => {
    if (!client) return '';

    return buildWhatsAppMessage(credentialsTemplate, {
      nombre: client.fullName?.split(' ')?.[0] || client.fullName || 'hola',
      estudio: studioName,
      usuario: client.username || '',
      contraseña: password || '••••••',
      enlace: loginUrl,
    });
  }, [client, password, studioName, loginUrl, credentialsTemplate]);

  const handleClose = () => {
    if (updateClient.isPending) {
      return;
    }

    setError('');
    setSent(false);
    onClose();
  };

  const openWhatsAppWithCredentials = (plainPassword) => {
    const message = buildWhatsAppMessage(credentialsTemplate, {
      nombre: client.fullName?.split(' ')?.[0] || client.fullName || 'hola',
      estudio: studioName,
      usuario: client.username || '',
      contraseña: plainPassword,
      enlace: loginUrl,
    });

    openWhatsApp({
      phone: phoneDigits,
      message,
    });
    setSent(true);
  };

  const handleSend = async () => {
    setError('');

    if (!hasPhone) {
      setError('Este cliente no tiene un número de teléfono cargado.');
      return;
    }

    const nextPassword = password.trim();

    if (!nextPassword || nextPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      if (isResend) {
        await updateClient.mutateAsync({
          id: client.id,
          payload: { password: nextPassword },
        });
        setPasswordUpdated(true);
      }

      openWhatsAppWithCredentials(nextPassword);
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'No se pudo preparar el envío de credenciales.'));
    }
  };

  if (!client) {
    return null;
  }

  const title = isResend ? 'Reenviar credenciales' : 'Cliente creado';
  const description = isResend
    ? `Vas a generar una nueva contraseña para ${client.fullName} y enviársela por WhatsApp.`
    : `"${client.fullName}" ya está registrado. Enviá las credenciales por WhatsApp y después vas a poder asignarle un plan.`;

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description} size="md">
      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {passwordUpdated ? (
          <Alert variant="success">Contraseña actualizada correctamente.</Alert>
        ) : null}
        {sent ? (
          <Alert variant="success">
            WhatsApp abierto. Completá el envío desde la app si no se envió solo.
          </Alert>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-text">
              <NavIcon name="user" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{client.fullName}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Usuario: <span className="font-medium text-text">{client.username}</span>
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Teléfono:{' '}
                <span className="font-medium text-text">
                  {client.phone?.trim() || 'No cargado'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {!hasPhone ? (
          <Alert variant="error">
            Falta el número de teléfono de este cliente, así que no se pueden enviar
            las credenciales por WhatsApp. Editá el cliente, agregá el teléfono y
            volvé a intentar.
          </Alert>
        ) : (
          <>
            {isResend ? (
              <div className="space-y-3">
                <Alert variant="error" className="border-amber-100 bg-amber-50 text-warning">
                  Por seguridad no guardamos la contraseña anterior. Al reenviar se
                  genera una nueva y reemplaza la actual.
                </Alert>
                <Input
                  label="Nueva contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="rounded-lg p-1 text-text-muted transition hover:text-text"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <NavIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
                    </button>
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setPassword(generatePassword());
                    setShowPassword(true);
                  }}
                >
                  Generar otra contraseña
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Vista previa del mensaje
              </p>
              <pre className="mt-2 wrap-anywhere whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
                {previewMessage}
              </pre>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={updateClient.isPending}
            className="w-full sm:w-auto"
          >
            {isResend
              ? hasPhone
                ? 'Cancelar'
                : 'Entendido'
              : sent || !hasPhone
                ? 'Continuar'
                : 'Ahora no'}
          </Button>
          {hasPhone ? (
            <Button
              type="button"
              onClick={handleSend}
              isLoading={updateClient.isPending}
              className="w-full sm:w-auto"
            >
              {sent
                ? 'Abrir WhatsApp de nuevo'
                : isResend
                  ? 'Actualizar y enviar'
                  : 'Sí, enviar por WhatsApp'}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
