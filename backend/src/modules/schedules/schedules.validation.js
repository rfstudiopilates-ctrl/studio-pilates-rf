import { z } from 'zod';

const scheduleSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora inválida'),
  capacity: z.coerce.number().int().min(1).max(50).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(15).max(240).nullable().optional(),
});

export const replaceScheduleSchema = z.object({
  slots: z.array(scheduleSlotSchema).max(200),
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
