import { z } from 'zod';
import { MOVEMENT_TYPES, PAYMENT_METHODS, SETTLEMENT_ACTIONS } from './finances.constants.js';

export const createMovementSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    description: z.string().min(2).max(500),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'payment' && !data.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccioná un método de pago',
        path: ['paymentMethod'],
      });
    }

    if (data.type !== 'payment' && data.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El método de pago solo aplica a pagos',
        path: ['paymentMethod'],
      });
    }
  });

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(MOVEMENT_TYPES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const listAllMovementsQuerySchema = listMovementsQuerySchema.extend({
  q: z.string().max(100).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
});

export const financeOverviewQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
});

export const planSettlementSchema = z
  .object({
    clientPlanId: z.coerce.number().int().positive(),
    action: z.enum(SETTLEMENT_ACTIONS),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'pay' && !data.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccioná un método de pago',
        path: ['paymentMethod'],
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
