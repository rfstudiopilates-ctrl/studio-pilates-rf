import { Router } from 'express';
import { testDatabaseConnection } from '../../config/database.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const dbConnected = await testDatabaseConnection();

    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'Studio Pilates RF API',
        environment: env.nodeEnv,
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        timezone: env.timezone,
      },
    });
  } catch (error) {
    error.statusCode = 503;
    next(error);
  }
});

export default router;
