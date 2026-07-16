import { Router } from 'express';
import * as classesController from './classes.controller.js';
import {
  availabilityQuerySchema,
  calendarQuerySchema,
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
router.get('/', validateQuery(listClassesQuerySchema), classesController.listClasses);
router.get('/:id', classesController.getClass);
router.patch('/:id', validateBody(updateClassSchema), classesController.updateClass);

export default router;
