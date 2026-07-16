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

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.isProduction ? 200 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { message: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' },
      },
    })
  );

  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
