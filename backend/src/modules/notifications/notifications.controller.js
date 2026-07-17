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

export async function getInbox(req, res, next) {
  try {
    const data = await notificationsService.getInbox(
      req.auth.role,
      req.auth.sub,
      req.validatedQuery || {}
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const data = await notificationsService.getUnreadCount(req.auth.role, req.auth.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await notificationsService.markAsRead(
      req.auth.role,
      req.auth.sub,
      req.params.id
    );
    res.json({ success: true, data: { notification } });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const data = await notificationsService.markAllAsRead(req.auth.role, req.auth.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
