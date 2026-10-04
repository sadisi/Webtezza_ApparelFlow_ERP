/**
 * Validation: Verification Zod schemas.
 *
 * SECURITY NOTES:
 *   - expected_quantity is NOT accepted from the client.
 *   - traffic_light status is NOT accepted from the client.
 *     Both are recomputed server-side by the gatekeeper.
 *   - verifier_id is NOT accepted from the client.
 *     It comes from the authenticated server session.
 *   - rejection reason is MANDATORY and must be non-empty.
 */
import { z } from 'zod';

/** Schema for submitting a component count. */
export const componentCountSchema = z.object({
  // Only actual_quantity is accepted from the client.
  // expected_quantity, traffic_light, verifier_id are all server-computed.
  actual_quantity: z
    .number({ invalid_type_error: 'Count must be a number', required_error: 'Count must be a number' })
    .int('Count must be a whole number')
    .nonnegative('Count cannot be negative')
    .max(1_000_000, 'Count is unrealistically large'),
});

export type ComponentCountInput = z.infer<typeof componentCountSchema>;

/** Schema for approving a verification batch.
 *  The body is intentionally empty — the order ID comes from the URL param.
 *  No client-supplied data is trusted for approval. */
export const approveVerificationSchema = z.object({}).strict();

export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;

/** Schema for rejecting a verification batch. Reason is mandatory. */
export const rejectVerificationSchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required', invalid_type_error: 'Rejection reason is required' })
    .trim()
    .min(1, 'Rejection reason cannot be empty')
    .max(1_000, 'Rejection reason must be 1000 characters or fewer'),
});

export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
