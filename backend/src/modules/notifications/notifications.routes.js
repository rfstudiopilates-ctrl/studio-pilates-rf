import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import {
  inboxQuerySchema,
  pushSubscribeSchema,
  unsubscribeSchema,
  validateBody,
  validateQuery,
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

router.get(
  '/inbox',
  authenticate,
  authorize('admin', 'client'),
  validateQuery(inboxQuerySchema),
  notificationsController.getInbox
);

router.get(
  '/inbox/unread-count',
  authenticate,
  authorize('admin', 'client'),
  notificationsController.getUnreadCount
);

router.post(
  '/inbox/read-all',
  authenticate,
  authorize('admin', 'client'),
  notificationsController.markAllAsRead
);

router.post(
  '/inbox/:id/read',
  authenticate,
  authorize('admin', 'client'),
  notificationsController.markAsRead
);

router.get(
  '/push/status',
  authenticate,
  authorize('admin', 'client'),
  notificationsController.getPushStatus
);

router.post(
  '/push/test',
  authenticate,
  authorize('admin', 'client'),
  notificationsController.sendTestPush
);

export default router;
