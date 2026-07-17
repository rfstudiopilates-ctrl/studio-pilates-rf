import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import clientsRoutes from '../modules/clients/clients.routes.js';
import plansRoutes from '../modules/plans/plans.routes.js';
import financesRoutes from '../modules/finances/finances.routes.js';
import schedulesRoutes from '../modules/schedules/schedules.routes.js';
import classesRoutes from '../modules/classes/classes.routes.js';
import reservationsRoutes from '../modules/reservations/reservations.routes.js';
import scheduleChangesRoutes from '../modules/schedule-changes/schedule-changes.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import adminsRoutes from '../modules/admins/admins.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/admins', adminsRoutes);
router.use('/clients', clientsRoutes);
router.use('/plans', plansRoutes);
router.use('/finances', financesRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/classes', classesRoutes);
router.use('/reservations', reservationsRoutes);
router.use('/schedule-changes', scheduleChangesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Studio Pilates RF API',
      version: '1.0.0',
      docs: '/api/health',
    },
  });
});

export default router;
