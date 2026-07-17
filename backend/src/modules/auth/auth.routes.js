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

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Los accesos correctos no deben consumir el cupo de seguridad.
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      message: 'Demasiados intentos de acceso fallidos. Esperá unos minutos e intentá nuevamente.',
    },
  },
});

const passwordRecoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Demasiadas solicitudes de recuperación. Esperá unos minutos.',
    },
  },
});

router.post('/login', loginRateLimiter, validateBody(loginSchema), authController.login);
router.post(
  '/admin/login',
  loginRateLimiter,
  validateBody(adminLoginSchema),
  authController.adminLogin
);
router.post(
  '/client/login',
  loginRateLimiter,
  validateBody(clientLoginSchema),
  authController.clientLogin
);
// El refresh es automático y puede ocurrir simultáneamente en muchos dispositivos.
// Queda protegido por el límite general de la API, no por el de contraseñas.
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/forgot-password',
  passwordRecoveryRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordRecoveryRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);
router.post('/pwa-installed', authenticate, authController.markPwaInstalled);

export default router;
