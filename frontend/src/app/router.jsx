import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/auth/ProtectedRoute';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import SettingsPage from '../pages/admin/SettingsPage';
import ClientsListPage from '../pages/admin/clients/ClientsListPage';
import ClientDetailPage from '../pages/admin/clients/ClientDetailPage';
import RedirectClientEditPage from '../pages/admin/clients/RedirectClientEditPage';
import RedirectPlanEditPage from '../pages/admin/plans/RedirectPlanEditPage';
import ClassesHubPage from '../pages/admin/classes/ClassesHubPage';
import ReportsPage from '../pages/admin/reports/ReportsPage';
import FinancesPage from '../pages/admin/finances/FinancesPage';
import LoginPage from '../pages/auth/LoginPage';
import ClientDashboardPage from '../pages/client/ClientDashboardPage';
import ClientAccountPage from '../pages/client/ClientAccountPage';
import ClientReservationsPage from '../pages/client/ClientReservationsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<Navigate to="/" replace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/clientes" element={<ClientsListPage />} />
          <Route path="/admin/clientes/nuevo" element={<Navigate to="/admin/clientes?crear=1" replace />} />
          <Route path="/admin/clientes/:id/editar" element={<RedirectClientEditPage />} />
          <Route path="/admin/clientes/:id" element={<ClientDetailPage />} />
          <Route
            path="/admin/planes"
            element={<Navigate to="/admin/configuracion?tab=planes" replace />}
          />
          <Route
            path="/admin/planes/nuevo"
            element={<Navigate to="/admin/configuracion?tab=planes&crear=1" replace />}
          />
          <Route path="/admin/planes/:id/editar" element={<RedirectPlanEditPage />} />
          <Route path="/admin/finanzas" element={<FinancesPage />} />
          <Route path="/admin/clases" element={<ClassesHubPage />} />
          <Route
            path="/admin/horarios"
            element={<Navigate to="/admin/clases?tab=horarios" replace />}
          />
          <Route
            path="/admin/cambios-horario"
            element={<Navigate to="/admin/clases?tab=cambios" replace />}
          />
          <Route path="/admin/notificaciones" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/reportes" element={<ReportsPage />} />
          <Route path="/admin/configuracion" element={<SettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route path="/cliente" element={<ClientDashboardPage />} />
          <Route path="/cliente/reservas" element={<ClientReservationsPage />} />
          <Route path="/cliente/cuenta" element={<ClientAccountPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
