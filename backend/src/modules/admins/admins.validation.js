import { z } from 'zod';
import { clientPasswordSchema } from '../clients/clients.password.js';
import { formatZodValidationError } from '../../utils/validation.js';

const usernameSchema = z
  .string()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(50)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Usuario inválido. Solo letras, números, punto, guión y guión bajo');

const emailSchema = z
  .string()
  .trim()
  .email('Email inválido')
  .max(150)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(clientPasswordSchema.min, clientPasswordSchema.minMessage)
  .max(clientPasswordSchema.max);

export const listAdminsQuerySchema = z.object({
  q: z.string().max(100).optional(),
  isActive: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === 'true' || value === '1';
    }),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createAdminSchema = z.object({
  fullName: z.string().trim().min(2, 'Nombre inválido').max(150),
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const updateAdminSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nombre inválido').max(150).optional(),
    email: emailSchema.optional(),
    username: usernameSchema.optional(),
    password: passwordSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
  });

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const { message, fields } = formatZodValidationError(result.error);
      return res.status(400).json({ success: false, error: { message, fields } });
    }

    req.validatedBody = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const { message, fields } = formatZodValidationError(result.error);
      return res.status(400).json({ success: false, error: { message, fields } });
    }

    req.validatedQuery = result.data;
    return next();
  };
}
