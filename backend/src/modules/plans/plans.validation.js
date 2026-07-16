import { z } from 'zod';
import { PLAN_STATUSES } from './plans.constants.js';

export const createPlanSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  weeklyClasses: z.number().int().min(0).max(50),
  monthlyClasses: z.number().int().min(0).max(200),
  durationDays: z.number().int().min(1).max(365),
  status: z.enum(PLAN_STATUSES).default('active'),
});

export const updatePlanSchema = createPlanSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
  });

export const listPlansQuerySchema = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const assignPlanSchema = z.object({
  planId: z.coerce.number().int().positive(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
});

export const listClientPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const cancelPlanSchema = z
  .object({
    withRefund: z.boolean().default(false),
    refundAmount: z.coerce.number().nonnegative().optional(),
    paymentMethod: z
      .enum(['cash', 'transfer', 'credit_card', 'debit_card'])
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.withRefund && !(Number(data.refundAmount) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá el monto a devolver o condonar',
        path: ['refundAmount'],
      });
    }
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
