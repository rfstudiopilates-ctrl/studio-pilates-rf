import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import {
  pushSubscribeSchema,
  unsubscribeSchema,
  validateBody,
} from './notifications.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get('/vapid-public-key', notificationsController.getVapidPublicKey);

router.post(
  '/push/subscribe',
  authenticate,
  authorize('admin', 'client'),
  validateBody(pushSubscribeSchema),
  notificationsController.subscribePush
);

router.post(
  '/push/unsubscribe',
  authenticate,
  authorize('admin', 'client'),
  validateBody(unsubscribeSchema),
  notificationsController.unsubscribePush
);

export default router;
