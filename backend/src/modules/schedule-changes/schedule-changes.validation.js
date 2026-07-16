import { z } from 'zod';
import { SCHEDULE_CHANGE_STATUSES } from './schedule-changes.constants.js';

export const createScheduleChangeSchema = z.object({
  reservationId: z.coerce.number().int().positive(),
  toGeneratedClassId: z.coerce.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export const rejectScheduleChangeSchema = z.object({
  adminNotes: z.string().max(500).optional(),
});

export const approveScheduleChangeSchema = z.object({
  toGeneratedClassId: z.coerce.number().int().positive().optional(),
  adminNotes: z.string().max(500).optional(),
});

export const adminReassignSchema = z.object({
  reservationId: z.coerce.number().int().positive(),
  toGeneratedClassId: z.coerce.number().int().positive(),
  adminNotes: z.string().max(500).optional(),
});

export const listScheduleChangesQuerySchema = z.object({
  status: z.enum(SCHEDULE_CHANGE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
