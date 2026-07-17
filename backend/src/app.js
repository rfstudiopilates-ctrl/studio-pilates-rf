import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Railway antepone un proxy. Esto permite que Express use la IP real del cliente.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests sin Origin (health checks, curl, same-origin server-side).
        if (!origin) {
          callback(null, true);
          return;
        }

        if (env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const apiRateLimiter = rateLimit({
    // El límite anterior (200 cada 15 min) incluía todas las lecturas automáticas
    // de la PWA y bloqueaba uso legítimo, especialmente detrás de una misma red.
    windowMs: 5 * 60 * 1000,
    max: env.isProduction ? 600 : 3000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
    message: {
      success: false,
      error: {
        message:
          'Se alcanzó temporalmente el límite de actividad. Esperá unos segundos e intentá nuevamente.',
      },
    },
  });

  app.use('/api', apiRateLimiter, apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
