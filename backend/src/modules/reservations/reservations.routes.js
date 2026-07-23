import { Router } from 'express';
import * as reservationsController from './reservations.controller.js';
import {
  cancelReservationSchema,
  confirmReservationSchema,
  createRecurringSchema,
  adminCreateReservationSchema,
  clientCreateReservationSchema,
  listReservationsQuerySchema,
  listAllRecurringQuerySchema,
  updateRecurringSchema,
  validateBody,
  validateQuery,
} from './reservations.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get(
  '/me',
  authenticate,
  authorize('client'),
  validateQuery(listReservationsQuerySchema),
  reservationsController.getMyReservations
);

router.get(
  '/me/recovery-credits',
  authenticate,
  authorize('client'),
  reservationsController.getMyRecoveryCredits
);

router.get(
  '/me/recurring',
  authenticate,
  authorize('client'),
  reservationsController.getMyRecurring
);

router.post(
  '/me',
  authenticate,
  authorize('client'),
  validateBody(clientCreateReservationSchema),
  reservationsController.createMyReservation
);

router.patch(
  '/me/:id/cancel',
  authenticate,
  authorize('client'),
  validateBody(cancelReservationSchema),
  reservationsController.cancelMyReservation
);

router.use(authenticate, authorize('admin'));

router.get('/', validateQuery(listReservationsQuerySchema), reservationsController.listReservations);
router.get(
  '/class/:classId',
  reservationsController.getClassReservations
);
router.get(
  '/client/:clientId',
  validateQuery(listReservationsQuerySchema),
  reservationsController.getClientReservations
);
router.post('/', validateBody(adminCreateReservationSchema), reservationsController.createReservationAdmin);
router.patch(
  '/:id/confirm',
  validateBody(confirmReservationSchema),
  reservationsController.confirmReservation
);
router.patch(
  '/:id/cancel',
  validateBody(cancelReservationSchema),
  reservationsController.cancelReservationAdmin
);
router.patch('/:id/clear-cancellation', reservationsController.clearCancelledReservation);

router.post('/recurring', validateBody(createRecurringSchema), reservationsController.createRecurring);
router.get(
  '/recurring',
  validateQuery(listAllRecurringQuerySchema),
  reservationsController.listAllRecurring
);
router.get('/recurring/client/:clientId', reservationsController.listClientRecurring);
router.patch('/recurring/:id', validateBody(updateRecurringSchema), reservationsController.updateRecurring);
router.post('/recurring/process', reservationsController.processRecurring);

export default router;
