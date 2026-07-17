import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import NavIcon from '../ui/NavIcon';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInbox,
  useUnreadNotificationsCount,
} from '../../hooks/useNotifications';

function toAppPath(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    if (url.startsWith('/')) {
      return url;
    }

    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function formatRelativeTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return 'Ahora';
  }
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Hace ${days} d`;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadNotificationsCount();
  const { data: inboxData, isLoading, isFetching } = useNotificationsInbox({
    enabled: open,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = Number(unreadData?.unreadCount || 0);
  const items = inboxData?.items || [];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleOpenItem = async (item) => {
    if (!item.isRead) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        // Navegar igual aunque falle el marcado.
      }
    }

    setOpen(false);
    const path = toAppPath(item.payload?.url);
    if (path) {
      navigate(path);
    }
  };

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed inset-x-3 top-[4.25rem] z-[80] mx-auto w-auto max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_50px_rgba(26,26,26,0.18)] sm:inset-x-auto sm:right-4 sm:left-auto sm:mx-0 sm:w-[22rem]"
          role="dialog"
          aria-label="Notificaciones"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Notificaciones</p>
              <p className="text-xs text-text-muted">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Estás al día'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-text hover:bg-surface-muted disabled:opacity-60"
              >
                Marcar leídas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain">
            {isLoading || (isFetching && items.length === 0) ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                Cargando…
              </p>
            ) : null}

            {!isLoading && !isFetching && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                No tenés notificaciones todavía.
              </p>
            ) : null}

            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenItem(item)}
                className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-muted ${
                  item.isRead ? 'bg-white' : 'bg-brand-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`min-w-0 flex-1 break-words text-sm leading-snug ${
                      item.isRead ? 'font-medium text-text' : 'font-semibold text-text'
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.isRead ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-300" />
                  ) : null}
                </div>
                <p className="break-words text-xs leading-relaxed text-text-muted">
                  {item.body}
                </p>
                <p className="text-[11px] text-text-muted/80">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl border border-border p-2 text-text-muted transition hover:bg-surface-muted hover:text-text"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={open}
      >
        <NavIcon name="bell" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-300 px-1 text-[10px] font-bold text-text">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}
