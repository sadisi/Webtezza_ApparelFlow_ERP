/**
 * Validation: Auth schemas (login form server-side validation).
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
