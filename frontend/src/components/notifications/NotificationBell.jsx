import { useEffect, useRef, useState } from 'react';
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
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadNotificationsCount();
  const { data: inboxData, isLoading } = useNotificationsInbox({ enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = Number(unreadData?.unreadCount || 0);
  const items = inboxData?.items || [];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
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

  return (
    <div className="relative" ref={panelRef}>
      <button
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

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-text">Notificaciones</p>
              <p className="text-xs text-text-muted">
                {unreadCount > 0
                  ? `${unreadCount} sin leer`
                  : 'Estás al día'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-text hover:underline disabled:opacity-60"
              >
                Marcar leídas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                Cargando…
              </p>
            ) : null}

            {!isLoading && items.length === 0 ? (
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
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm ${
                      item.isRead
                        ? 'font-medium text-text'
                        : 'font-semibold text-text'
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.isRead ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-300" />
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-text-muted">{item.body}</p>
                <p className="text-[11px] text-text-muted/80">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
