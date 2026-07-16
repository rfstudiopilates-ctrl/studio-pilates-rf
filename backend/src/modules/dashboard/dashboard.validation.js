import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const dashboardQuerySchema = z.object({
  period: z.enum(['week', 'month', '30d', 'custom']).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

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
