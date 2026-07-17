import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/useSettings';
import { useSidebar } from '../../hooks/useSidebar';
import AppSidebar from './AppSidebar';
import NavIcon from '../ui/NavIcon';
import { Button } from '../ui/Button';
import NotificationBell from '../notifications/NotificationBell';

export default function AppShell({
  title,
  subtitle,
  children,
  navItems,
  panelLabel,
  storageKey,
}) {
  const { user, logout } = useAuth();
  const { data: settings } = usePublicSettings();
  const location = useLocation();
  const { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile } =
    useSidebar(storageKey);

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppSidebar
        items={navItems}
        settings={settings}
        panelLabel={panelLabel}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        onToggleCollapsed={toggleCollapsed}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={openMobile}
                className="rounded-xl border border-border p-2 text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
                aria-label="Abrir menú"
              >
                <NavIcon name="menu" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-text">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-sm text-text-muted">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NotificationBell />
              <span className="hidden max-w-[12rem] truncate text-sm text-text-muted md:inline">
                {user?.fullName}
              </span>
              <Button variant="secondary" onClick={logout}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
