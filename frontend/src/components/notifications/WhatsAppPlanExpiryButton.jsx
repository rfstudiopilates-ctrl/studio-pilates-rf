import { useState } from 'react';
import { useAdminSettings } from '../../hooks/useSettings';
import { getPlanExpiryInfo, openPlanExpiryNoticeWhatsApp } from '../../lib/planExpiryWhatsApp';

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.91-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.27.28-.46.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.06-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32Z" />
      <path d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.86.52 3.6 1.42 5.1L2 22l5.17-1.53a9.84 9.84 0 0 0 4.87 1.24h.01c5.46 0 9.89-4.43 9.89-9.89C21.94 6.43 17.5 2 12.04 2Zm0 18.08h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.07.9.9-3-.2-.31a8.2 8.2 0 0 1-1.26-4.4c0-4.53 3.68-8.21 8.21-8.21 4.53 0 8.21 3.68 8.21 8.21 0 4.53-3.68 8.14-8.3 8.14Z" />
    </svg>
  );
}

export default function WhatsAppPlanExpiryButton({
  clientName,
  clientPhone,
  planName,
  endDate,
  variant = 'default',
  className = '',
  onError,
}) {
  const { data: settings, isLoading } = useAdminSettings();
  const [localError, setLocalError] = useState('');
  const info = getPlanExpiryInfo(endDate);
  const hasPhone = Boolean(String(clientPhone || '').replace(/\D/g, ''));

  if (!info || info.isExpired || !planName) {
    return null;
  }

  function handleClick() {
    setLocalError('');

    try {
      openPlanExpiryNoticeWhatsApp({
        settings,
        clientName,
        clientPhone,
        planName,
        endDate: info.endDate,
      });
    } catch (error) {
      const message = error.message || 'No se pudo abrir WhatsApp.';
      setLocalError(message);
      onError?.(message);
    }
  }

  const label =
    info.daysRemaining === 0
      ? 'Vence hoy · WP'
      : info.daysRemaining === 1
        ? 'Vence mañana · WP'
        : `Vence en ${info.daysRemaining}d · WP`;

  const title = hasPhone
    ? `Recordar por WhatsApp: el plan vence ${info.daysText}`
    : 'Este cliente no tiene teléfono cargado';

  const compact = variant === 'compact';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasPhone || isLoading}
        title={title}
        className={
          compact
            ? `inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs whitespace-nowrap ${
                info.isUrgent
                  ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`
            : `inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${
                info.isUrgent
                  ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`
        }
      >
        <WhatsAppIcon className={compact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4'} />
        {compact ? label : `Recordar vencimiento (${info.daysText})`}
      </button>
      {localError ? <p className="mt-1 text-xs text-danger sm:text-right">{localError}</p> : null}
    </div>
  );
}
