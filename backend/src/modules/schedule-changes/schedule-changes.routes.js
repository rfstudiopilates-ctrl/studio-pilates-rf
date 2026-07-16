import { Router } from 'express';
import * as scheduleChangesController from './schedule-changes.controller.js';
import {
  adminReassignSchema,
  approveScheduleChangeSchema,
  createScheduleChangeSchema,
  listScheduleChangesQuerySchema,
  rejectScheduleChangeSchema,
  validateBody,
  validateQuery,
} from './schedule-changes.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get(
  '/me',
  authenticate,
  authorize('client'),
  validateQuery(listScheduleChangesQuerySchema),
  scheduleChangesController.getMyScheduleChanges
);

router.post(
  '/me',
  authenticate,
  authorize('client'),
  validateBody(createScheduleChangeSchema),
  scheduleChangesController.createMyScheduleChange
);

router.patch(
  '/me/:id/cancel',
  authenticate,
  authorize('client'),
  scheduleChangesController.cancelMyScheduleChange
);

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
