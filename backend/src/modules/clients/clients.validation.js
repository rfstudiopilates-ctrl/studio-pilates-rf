import { z } from 'zod';
import { CLIENT_STATUSES } from './clients.constants.js';
import { clientPasswordSchema } from './clients.password.js';
import { formatZodValidationError } from '../../utils/validation.js';

const usernameSchema = z
  .string()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(50)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Usuario inválido. Solo letras, números, punto, guión y guión bajo');

const passwordSchema = z
  .string()
  .min(clientPasswordSchema.min, clientPasswordSchema.minMessage)
  .max(clientPasswordSchema.max);

const phoneSchema = z
  .string()
  .min(6, 'Teléfono inválido')
  .max(20)
  .regex(/^[0-9+()\s-]+$/, 'Teléfono inválido');

const statusSchema = z.enum(CLIENT_STATUSES);

export const createClientSchema = z.object({
  fullName: z.string().min(2, 'Nombre inválido').max(150),
  username: usernameSchema,
  password: passwordSchema,
  phone: z.union([phoneSchema, z.literal('')]).optional(),
  status: statusSchema.default('active'),
  internalNotes: z.string().max(5000).nullable().optional(),
});

export const updateClientSchema = z
  .object({
    fullName: z.string().min(2).max(150).optional(),
    username: usernameSchema.optional(),
    password: passwordSchema.optional(),
    phone: z.union([phoneSchema, z.literal('')]).optional(),
    status: statusSchema.optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debés enviar al menos un campo para actualizar',
  });

export const listClientsQuerySchema = z.object({
  q: z.string().max(100).optional(),
  status: statusSchema.optional(),
  account: z.enum(['active', 'deactivated', 'all']).default('active'),
  hasLogin: z.enum(['logged', 'never']).optional(),
  createdFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  createdTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['fullName', 'createdAt', 'status', 'username']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
