import { z } from 'zod';
import { EXPORT_FORMATS, REPORT_TYPES } from './reports.constants.js';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const reportQuerySchema = z.object({
  type: z.enum([
    REPORT_TYPES.SUMMARY,
    REPORT_TYPES.CLIENTS,
    REPORT_TYPES.FINANCES,
    REPORT_TYPES.OCCUPANCY,
    REPORT_TYPES.RESERVATIONS,
    REPORT_TYPES.PLANS,
    REPORT_TYPES.SCHEDULES,
    REPORT_TYPES.RECOVERIES,
  ]),
  period: z.enum(['week', 'month', '30d', 'custom']).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const exportQuerySchema = reportQuerySchema.extend({
  format: z.enum([EXPORT_FORMATS.PDF, EXPORT_FORMATS.XLSX]),
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
