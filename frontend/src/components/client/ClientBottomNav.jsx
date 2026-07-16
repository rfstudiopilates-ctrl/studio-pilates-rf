import { NavLink } from 'react-router-dom';
import NavIcon from '../ui/NavIcon';

export default function ClientBottomNav({ items = [] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3 gap-1 px-2 pt-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-brand-100 text-text'
                    : 'text-text-muted active:bg-surface-muted'
                }`
              }
            >
              <NavIcon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
