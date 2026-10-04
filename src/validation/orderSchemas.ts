/**
 * Validation: Cutting order Zod schemas.
 *
 * SECURITY NOTES:
 *   - expected_quantity is NOT accepted from the client.
 *     It is always computed server-side from recipe data.
 *   - status is NOT accepted from the client in create/update.
 *     State transitions use dedicated endpoints.
 */
import { z } from 'zod';

/** Schema for creating a new cutting order. */
export const createOrderSchema = z.object({
  recipe_id: z
    .string({ required_error: 'Recipe is required', invalid_type_error: 'Invalid recipe' })
    .uuid('Invalid recipe selection'),

  target_quantity: z
    .number({ required_error: 'Target quantity is required', invalid_type_error: 'Target quantity must be a number' })
    .int('Target quantity must be a whole number')
    .positive('Target quantity must be greater than 0')
    .max(100_000, 'Target quantity is unrealistically large'),

  fabric_roll_id: z
    .string({ required_error: 'Fabric Roll ID is required', invalid_type_error: 'Fabric Roll ID must be text' })
    .min(1, 'Fabric Roll ID is required')
    .max(100, 'Fabric Roll ID must be 100 characters or fewer')
    .trim(),

  actual_fabric_used: z
    .number({ required_error: 'Actual fabric used is required', invalid_type_error: 'Actual fabric must be a number' })
    .positive('Actual fabric used must be greater than 0')
    .max(100_000, 'Fabric quantity is unrealistically large'),

  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or fewer')
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
