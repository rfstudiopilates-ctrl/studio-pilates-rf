import { z } from 'zod';

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceLabel: z.string().max(150).optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const eventTypeEnum = z.enum([
  'newReservation',
  'pendingRequest',
  'cancellation',
  'scheduleChange',
  'reservationApproved',
  'reminder24h',
  'scheduleChangeApproved',
]);

export const listNotificationsQuerySchema = z.object({
  channel: z.enum(['push', 'whatsapp', 'in_app']).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']).optional(),
  eventType: eventTypeEnum.optional(),
  recipientType: z.enum(['admin', 'client']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const inboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      return res.status(400).json({ success: false, error: { message } });
    }
    req.validatedBody = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      return res.status(400).json({ success: false, error: { message } });
    }
    req.validatedQuery = result.data;
    return next();
  };
}
