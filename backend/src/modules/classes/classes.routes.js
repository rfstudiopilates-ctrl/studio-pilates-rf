import { Router } from 'express';
import * as classesController from './classes.controller.js';
import {
  availabilityQuerySchema,
  calendarQuerySchema,
  cancelFutureByScheduleBodySchema,
  cancelFutureByScheduleQuerySchema,
  listClassesQuerySchema,
  updateClassSchema,
  validateBody,
  validateQuery,
} from './classes.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get(
  '/availability',
  authenticate,
  authorize('admin', 'client'),
  validateQuery(availabilityQuerySchema),
  classesController.getAvailability
);

router.use(authenticate, authorize('admin'));

router.get('/calendar', validateQuery(calendarQuerySchema), classesController.getCalendar);
router.post('/generate', classesController.generateClasses);
router.get(
  '/schedule-cleanup-candidates',
  classesController.listScheduleCleanupCandidates
);
router.get(
  '/cancel-future-by-schedule/preview',
  validateQuery(cancelFutureByScheduleQuerySchema),
  classesController.previewCancelFutureBySchedule
);
router.post(
  '/cancel-future-by-schedule',
  validateBody(cancelFutureByScheduleBodySchema),
  classesController.cancelFutureBySchedule
);
router.get('/', validateQuery(listClassesQuerySchema), classesController.listClasses);
router.get('/:id', classesController.getClass);
router.patch('/:id', validateBody(updateClassSchema), classesController.updateClass);

export default router;
