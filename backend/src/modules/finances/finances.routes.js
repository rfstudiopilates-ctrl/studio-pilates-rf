import { Router } from 'express';
import * as financesController from './finances.controller.js';
import {
  createMovementSchema,
  financeOverviewQuerySchema,
  listAllMovementsQuerySchema,
  listMovementsQuerySchema,
  planSettlementSchema,
  validateBody,
  validateQuery,
} from './finances.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get('/me/account', authenticate, authorize('client'), financesController.getMyAccount);

router.use(authenticate, authorize('admin'));

router.get('/overview', validateQuery(financeOverviewQuerySchema), financesController.getFinanceOverview);
router.get('/movements', validateQuery(listAllMovementsQuerySchema), financesController.listAllMovements);

router.get(
  '/client/:clientId',
  validateQuery(listMovementsQuerySchema),
  financesController.getClientFinances
);
router.post(
  '/client/:clientId/movements',
  validateBody(createMovementSchema),
  financesController.createMovement
);
router.post(
  '/client/:clientId/plan-settlement',
  validateBody(planSettlementSchema),
  financesController.settlePlanAssignment
);

export default router;
