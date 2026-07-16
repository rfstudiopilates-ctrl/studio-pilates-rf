import * as authService from './auth.service.js';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../../utils/cookies.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function login(req, res, next) {
  try {
    const session = await authService.login(req.validatedBody);
    setRefreshTokenCookie(res, session.refreshToken);

    sendSuccess(res, {
      accessToken: session.accessToken,
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const session = await authService.loginAdmin(req.validatedBody);
    setRefreshTokenCookie(res, session.refreshToken);

    sendSuccess(res, {
      accessToken: session.accessToken,
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function clientLogin(req, res, next) {
  try {
    const session = await authService.loginClient(req.validatedBody);
    setRefreshTokenCookie(res, session.refreshToken);

    sendSuccess(res, {
      accessToken: session.accessToken,
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    const session = await authService.refreshSession(refreshToken);

    if (session.refreshToken) {
      setRefreshTokenCookie(res, session.refreshToken);
    }

    sendSuccess(res, {
      accessToken: session.accessToken,
      user: session.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);

    sendSuccess(res, { message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getAuthenticatedUser(req.auth.role, req.auth.sub);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService.requestPasswordReset(req.validatedBody.email);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.validatedBody);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword({
      role: req.auth.role,
      id: req.auth.sub,
      ...req.validatedBody,
    });

    clearRefreshTokenCookie(res);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
