import * as notificationsService from './notifications.service.js';

export async function getVapidPublicKey(req, res) {
  res.json({ success: true, data: notificationsService.getVapidPublicKey() });
}

export async function subscribePush(req, res, next) {
  try {
    const subscription = await notificationsService.subscribePush(
      req.auth.role,
      req.auth.sub,
      req.validatedBody
    );
    res.status(201).json({ success: true, data: { subscription } });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribePush(req, res, next) {
  try {
    const result = await notificationsService.unsubscribePush(
      req.auth.role,
      req.auth.sub,
      req.validatedBody.endpoint
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
