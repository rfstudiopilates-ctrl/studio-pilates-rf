import { Router } from 'express';
import * as scheduleChangesController from './schedule-changes.controller.js';
import {
  adminReassignSchema,
  approveScheduleChangeSchema,
  listScheduleChangesQuerySchema,
  rejectScheduleChangeSchema,
  validateBody,
  validateQuery,
} from './schedule-changes.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

/** PWA cacheada: bloquear solicitudes de cambio de horario del cliente. */
function blockClientScheduleChange(req, res) {
  res.status(403).json({
    success: false,
    error: {
      code: 'SCHEDULE_CHANGE_CLIENT_DISABLED',
      message:
        'Los cambios de horario los gestiona el estudio. Contactá al estudio si necesitás mover un turno.',
    },
  });
}

router.get('/me', authenticate, authorize('client'), blockClientScheduleChange);
router.post('/me', authenticate, authorize('client'), blockClientScheduleChange);
router.patch('/me/:id/cancel', authenticate, authorize('client'), blockClientScheduleChange);

router.use(authenticate, authorize('admin'));

router.get('/pending/count', scheduleChangesController.getPendingCount);
router.get('/', validateQuery(listScheduleChangesQuerySchema), scheduleChangesController.listScheduleChanges);
router.get('/:id', scheduleChangesController.getScheduleChange);
router.patch(
  '/:id/approve',
  validateBody(approveScheduleChangeSchema),
  scheduleChangesController.approveScheduleChange
);
router.patch(
  '/:id/reject',
  validateBody(rejectScheduleChangeSchema),
  scheduleChangesController.rejectScheduleChange
);
router.post('/reassign', validateBody(adminReassignSchema), scheduleChangesController.adminReassign);

export default router;
