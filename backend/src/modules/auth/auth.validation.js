import { z } from 'zod';
import { clientPasswordSchema } from '../clients/clients.password.js';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Usuario inválido'),
  password: z
    .string()
    .min(clientPasswordSchema.min, clientPasswordSchema.minMessage)
    .max(clientPasswordSchema.max),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Email inválido').max(150),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
});

export const clientLoginSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Usuario inválido'),
  password: z
    .string()
    .min(clientPasswordSchema.min, clientPasswordSchema.minMessage)
    .max(clientPasswordSchema.max),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(150),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Token inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128)
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(clientPasswordSchema.min)
    .max(clientPasswordSchema.max),
  newPassword: z
    .string()
    .min(clientPasswordSchema.min, clientPasswordSchema.minMessage)
    .max(clientPasswordSchema.max),
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

    req.validatedBody = result.data;
    return next();
  };
}
