import { verifyAccessToken } from '../utils/jwt.js';
import { createAppError } from '../utils/AppError.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw createAppError('No autorizado', 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    req.auth = {
      sub: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(createAppError('No tenés permisos para acceder a este recurso', 403));
    }

    return next();
  };
}
