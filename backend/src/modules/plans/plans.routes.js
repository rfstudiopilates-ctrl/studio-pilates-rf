import { Router } from 'express';
import * as plansController from './plans.controller.js';
import * as plansService from './plans.service.js';
import {
  assignPlanSchema,
  cancelPlanSchema,
  createPlanSchema,
  listClientPlansQuerySchema,
  listPlansQuerySchema,
  updatePlanSchema,
  validateBody,
  validateQuery,
} from './plans.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get('/me/active', authenticate, authorize('client'), async (req, res, next) => {
  try {
    const activePlan = await plansService.getActivePlanForClientRole(req.auth.sub);
    res.json({ success: true, data: { activePlan } });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate, authorize('admin'));

router.get('/', validateQuery(listPlansQuerySchema), plansController.listPlans);
router.get(
  '/client/:clientId',
  validateQuery(listClientPlansQuerySchema),
  plansController.getClientPlans
);
router.post(
  '/client/:clientId/assign',
  validateBody(assignPlanSchema),
  plansController.assignPlan
);
router.patch(
  '/assignment/:id/cancel',
  validateBody(cancelPlanSchema),
  plansController.cancelClientPlan
);
router.get('/:id', plansController.getPlan);
router.post('/', validateBody(createPlanSchema), plansController.createPlan);
router.patch('/:id', validateBody(updatePlanSchema), plansController.updatePlan);
router.delete('/:id', plansController.deletePlan);

export default router;
