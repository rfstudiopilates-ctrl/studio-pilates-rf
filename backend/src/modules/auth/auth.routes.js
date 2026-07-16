import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from './auth.controller.js';
import {
  adminLoginSchema,
  changePasswordSchema,
  clientLoginSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  validateBody,
} from './auth.validation.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Demasiados intentos. Intentá nuevamente más tarde.' },
  },
});

router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/admin/login', authRateLimiter, validateBody(adminLoginSchema), authController.adminLogin);
router.post('/client/login', authRateLimiter, validateBody(clientLoginSchema), authController.clientLogin);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
