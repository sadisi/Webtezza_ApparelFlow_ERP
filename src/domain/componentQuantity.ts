/**
 * Domain: Component Quantity Calculation
 *
 * Calculates expected component piece counts derived from recipe specifications
 * and target order batch size.
 *
 * SECURITY RULE:
 *   Expected quantity MUST ALWAYS be computed server-side from recipe component
 *   pieces_per_garment. Client-supplied expected_quantity is NEVER trusted.
 */

import { InvalidQuantityError } from './errors';

/**
 * Calculates the expected piece count for a component.
 *
 * @param targetQuantity Total number of garments in the cutting order batch (positive integer)
 * @param piecesPerGarment Pieces of this component required per garment (positive integer)
 * @returns Expected component piece count
 * @throws InvalidQuantityError if inputs are not positive integers
 */
export function calculateExpectedQuantity(
  targetQuantity: number,
  piecesPerGarment: number,
): number {
  if (
    typeof targetQuantity !== 'number' ||
    !Number.isFinite(targetQuantity) ||
    !Number.isInteger(targetQuantity) ||
    targetQuantity <= 0
  ) {
    throw new InvalidQuantityError(
      `Target quantity must be a positive integer, received: ${targetQuantity}`,
    );
  }

  if (
    typeof piecesPerGarment !== 'number' ||
    !Number.isFinite(piecesPerGarment) ||
    !Number.isInteger(piecesPerGarment) ||
    piecesPerGarment <= 0
  ) {
    throw new InvalidQuantityError(
      `Pieces per garment must be a positive integer, received: ${piecesPerGarment}`,
    );
  }

  return targetQuantity * piecesPerGarment;
}
