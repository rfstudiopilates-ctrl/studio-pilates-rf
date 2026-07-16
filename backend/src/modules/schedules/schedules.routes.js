import { Router } from 'express';
import * as schedulesController from './schedules.controller.js';
import { replaceScheduleSchema, validateBody } from './schedules.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', schedulesController.getWeeklySchedule);
router.put('/bulk', validateBody(replaceScheduleSchema), schedulesController.replaceWeeklySchedule);

export default router;
