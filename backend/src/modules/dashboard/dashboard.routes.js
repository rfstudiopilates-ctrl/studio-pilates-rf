import { Router } from 'express';
import * as dashboardController from './dashboard.controller.js';
import { dashboardQuerySchema, validateQuery } from './dashboard.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/overview', validateQuery(dashboardQuerySchema), dashboardController.getOverview);
router.get('/today', dashboardController.getToday);

export default router;
