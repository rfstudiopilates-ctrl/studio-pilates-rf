import { Router } from 'express';
import * as adminsController from './admins.controller.js';
import {
  createAdminSchema,
  listAdminsQuerySchema,
  updateAdminSchema,
  validateBody,
  validateQuery,
} from './admins.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', validateQuery(listAdminsQuerySchema), adminsController.listAdmins);
router.get('/:id', adminsController.getAdmin);
router.post('/', validateBody(createAdminSchema), adminsController.createAdmin);
router.patch('/:id', validateBody(updateAdminSchema), adminsController.updateAdmin);
router.delete('/:id', adminsController.deactivateAdmin);

export default router;
