import { Router } from 'express';
import * as clientsController from './clients.controller.js';
import {
  createClientSchema,
  historyQuerySchema,
  listClientsQuerySchema,
  updateClientSchema,
  validateBody,
  validateQuery,
} from './clients.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', validateQuery(listClientsQuerySchema), clientsController.listClients);
router.get('/:id', validateQuery(historyQuerySchema), clientsController.getClient);
router.post('/', validateBody(createClientSchema), clientsController.createClient);
router.patch('/:id', validateBody(updateClientSchema), clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

export default router;
