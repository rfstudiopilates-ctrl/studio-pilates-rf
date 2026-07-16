import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido. Usá formato hexadecimal (#RRGGBB)');

const whatsappMessagesSchema = z.object({
  reminder: z.string().min(1).max(1000),
  debtNotice: z.string().min(1).max(1000),
  paymentReceipt: z.string().min(1).max(1000),
  guestDropInOffer: z.string().min(1).max(1000),
  credentialsCreated: z.string().min(1).max(1000),
  credentialsResend: z.string().min(1).max(1000),
});

const notificationGroupSchema = z.record(z.string(), z.boolean());

const notificationSettingsSchema = z.object({
  admin: notificationGroupSchema,
  client: notificationGroupSchema,
});

export const updateSettingsSchema = z
  .object({
    studioName: z.string().min(2).max(150).optional(),
    logoUrl: z
      .union([z.string().url('URL de logo inválida'), z.literal(''), z.null()])
      .optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),
    whatsappNumber: z
      .union([
        z.string().regex(/^[0-9+()\s-]{6,20}$/, 'Número de WhatsApp inválido'),
        z.literal(''),
        z.null(),
      ])
      .optional(),
    whatsappMessages: whatsappMessagesSchema.optional(),
    notificationSettings: notificationSettingsSchema.optional(),
    maxClassCapacity: z.number().int().min(1).max(50).optional(),
    classDurationMinutes: z.number().int().min(15).max(240).optional(),
    cancellationHours: z.number().int().min(0).max(72).optional(),
    pendingHoldHours: z.number().int().min(1).max(168).optional(),
    blockBookingOnDebt: z.boolean().optional(),
    debtBookingBlockAmount: z.number().min(0).max(99999999.99).optional(),
    recoveryExpiresEndOfMonth: z.boolean().optional(),
    dropInPlanId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    timezone: z.literal('America/Argentina/Buenos_Aires').optional(),
    fiscalName: z.union([z.string().max(200), z.literal(''), z.null()]).optional(),
    fiscalId: z.union([z.string().max(50), z.literal(''), z.null()]).optional(),
    fiscalAddress: z.union([z.string().max(300), z.literal(''), z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
  });

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      return res.status(400).json({
        success: false,
        error: { message },
      });
    }

    req.validatedBody = normalizeSettingsPayload(result.data);
    return next();
  };
}

function normalizeSettingsPayload(data) {
  return {
    ...data,
    logoUrl: data.logoUrl === '' ? null : data.logoUrl,
    whatsappNumber: data.whatsappNumber === '' ? null : data.whatsappNumber,
    fiscalName: data.fiscalName === '' ? null : data.fiscalName,
    fiscalId: data.fiscalId === '' ? null : data.fiscalId,
    fiscalAddress: data.fiscalAddress === '' ? null : data.fiscalAddress,
  };
}
