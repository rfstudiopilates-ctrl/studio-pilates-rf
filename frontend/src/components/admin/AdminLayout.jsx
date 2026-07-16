import AppShell from '../layout/AppShell';
import { ADMIN_NAV_ITEMS, ADMIN_SIDEBAR_STORAGE_KEY } from '../../constants/adminNav';

export default function AdminLayout({ title, subtitle, children }) {
  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      navItems={ADMIN_NAV_ITEMS}
      panelLabel="Panel administrador"
      storageKey={ADMIN_SIDEBAR_STORAGE_KEY}
    >
      {children}
    </AppShell>
  );
}
