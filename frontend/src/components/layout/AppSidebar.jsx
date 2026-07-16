import { NavLink } from 'react-router-dom';
import StudioLogo from '../studio/StudioLogo';
import NavIcon from '../ui/NavIcon';

export default function AppSidebar({
  items,
  settings,
  panelLabel,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white shadow-[4px_0_24px_rgba(26,26,26,0.06)] transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 ${collapsed ? 'lg:w-[4.5rem]' : ''}`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-border ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <StudioLogo settings={settings} size={collapsed ? 'sm' : 'md'} />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {settings?.studioName || 'Studio Pilates RF'}
                </p>
                <p className="truncate text-xs text-text-muted">{panelLabel}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
            aria-label="Cerrar menú"
          >
            <NavIcon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-brand-100 text-text'
                        : 'text-text-muted hover:bg-surface-muted hover:text-text'
                    }`
                  }
                >
                  <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden border-t border-border p-2 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-muted hover:text-text ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
            aria-label={collapsed ? 'Expandir menú' : 'Ocultar menú'}
          >
            <NavIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} className="h-5 w-5" />
            {!collapsed ? <span>Ocultar menú</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
