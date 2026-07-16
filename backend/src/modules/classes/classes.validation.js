import { z } from 'zod';
import { CLASS_STATUSES } from './classes.constants.js';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const listClassesQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.enum(CLASS_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const calendarQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.enum(CLASS_STATUSES).optional(),
});

export const availabilityQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const updateClassSchema = z
  .object({
    capacity: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(CLASS_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
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
