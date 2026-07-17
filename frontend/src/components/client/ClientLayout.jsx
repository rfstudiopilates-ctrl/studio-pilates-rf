import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/useSettings';
import { useSidebar } from '../../hooks/useSidebar';
import { useSyncPushSubscription } from '../../hooks/useNotifications';
import { CLIENT_NAV_ITEMS, CLIENT_SIDEBAR_STORAGE_KEY } from '../../constants/clientNav';
import AppSidebar from '../layout/AppSidebar';
import StudioLogo from '../studio/StudioLogo';
import { Button } from '../ui/Button';
import NotificationBell from '../notifications/NotificationBell';
import ClientBottomNav from './ClientBottomNav';

export default function ClientLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const { data: settings } = usePublicSettings();
  const { collapsed, toggleCollapsed } = useSidebar(CLIENT_SIDEBAR_STORAGE_KEY);

  // Mantiene la suscripción push activa en la PWA del cliente (iOS/Android).
  useSyncPushSubscription();

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="hidden lg:block">
        <AppSidebar
          items={CLIENT_NAV_ITEMS}
          settings={settings}
          panelLabel="Panel cliente"
          collapsed={collapsed}
          mobileOpen={false}
          onCloseMobile={() => {}}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <StudioLogo settings={settings} size="sm" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-text sm:text-lg">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-xs text-text-muted sm:text-sm">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NotificationBell />
              <span className="hidden max-w-[10rem] truncate text-sm text-text-muted md:inline">
                {user?.fullName}
              </span>
              <Button
                variant="secondary"
                onClick={logout}
                className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
              >
                Salir
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:pb-6">{children}</main>
      </div>

      <ClientBottomNav items={CLIENT_NAV_ITEMS} />
    </div>
  );
}
