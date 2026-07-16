import { Router } from 'express';
import * as reportsController from './reports.controller.js';
import {
  exportQuerySchema,
  reportQuerySchema,
  validateQuery,
} from './reports.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/preview', validateQuery(reportQuerySchema), reportsController.getReportPreview);
router.get('/export', validateQuery(exportQuerySchema), reportsController.exportReport);
router.get('/receipts/:movementId/pdf', reportsController.downloadReceiptPdf);
router.get('/receipts/:movementId/whatsapp', reportsController.getReceiptWhatsApp);

export default router;
