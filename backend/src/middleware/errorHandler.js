import { env } from '../config/env.js';
import { createAppError } from '../utils/AppError.js';

function mapDatabaseError(err) {
  if (!err || typeof err !== 'object') {
    return null;
  }

  // Deadlock / lock wait: no mostrar basura de MySQL al usuario.
  if (err.code === 'ER_LOCK_WAIT_TIMEOUT' || err.errno === 1205) {
    return createAppError(
      'La operación tardó demasiado por congestión. Intentá de nuevo en unos segundos.',
      409
    );
  }

  if (err.code === 'ER_LOCK_DEADLOCK' || err.errno === 1213) {
    return createAppError(
      'Hubo un conflicto al guardar. Intentá de nuevo.',
      409
    );
  }

  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return createAppError('Ese registro ya existe o está duplicado.', 409);
  }

  return null;
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const mapped = mapDatabaseError(err);
  const finalError = mapped || err;

  const statusCode = finalError.statusCode || 500;
  const message = finalError.message || 'Error interno del servidor';

  if (!env.isProduction) {
    console.error('[Error]', err);
  } else {
    console.error('[Error]', { message, statusCode, path: req.path, code: err.code });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        statusCode === 500 && env.isProduction ? 'Error interno del servidor' : message,
      ...(finalError.fields ? { fields: finalError.fields } : {}),
      ...(env.isProduction ? {} : { stack: err.stack }),
    },
  });
}
