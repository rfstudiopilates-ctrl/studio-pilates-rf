import { z } from 'zod';
import { RESERVATION_STATUSES, RECURRING_STATUSES, BOOKING_TYPES } from './reservations.constants.js';
import { PAYMENT_METHODS } from '../finances/finances.constants.js';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const createReservationSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  generatedClassId: z.coerce.number().int().positive(),
  recoveryCreditId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
  notes: z.string().max(500).optional(),
});

export const adminCreateReservationSchema = createReservationSchema.extend({
  clientId: z.coerce.number().int().positive(),
});

export const clientCreateReservationSchema = z.object({
  generatedClassId: z.coerce.number().int().positive(),
  recoveryCreditId: z.coerce.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const confirmReservationSchema = z
  .object({
    depositAmount: z.coerce.number().min(0, 'El monto de la seña no puede ser negativo').optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const amount = data.depositAmount == null ? null : Number(data.depositAmount);

    if (amount != null && amount > 0 && !data.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccioná el método de pago de la seña',
        path: ['paymentMethod'],
      });
    }
  });

export const cancelReservationSchema = z.object({
  cancellationReason: z.string().max(500).optional(),
});

export const listReservationsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  bookingType: z.enum(BOOKING_TYPES).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  cancelledBy: z.enum(['client', 'admin']).optional(),
  search: z.string().trim().max(120).optional(),
  cleared: z.enum(['open', 'cleared', 'all']).optional(),
  sortBy: z.enum(['class_date', 'cancelled_at', 'client_name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createRecurringSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  scheduleTemplateId: z.coerce.number().int().positive(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
});

export const updateRecurringSchema = z
  .object({
    status: z.enum(RECURRING_STATUSES).optional(),
    endDate: dateSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
  });

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
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
