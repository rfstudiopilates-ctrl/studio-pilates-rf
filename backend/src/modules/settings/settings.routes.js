import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import { updateSettingsSchema, validateBody } from './settings.validation.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const router = Router();

router.get('/public', settingsController.getPublicSettings);

router.get('/', authenticate, authorize('admin'), settingsController.getAdminSettings);
router.patch('/', authenticate, authorize('admin'), validateBody(updateSettingsSchema), settingsController.updateSettings);

export default router;
