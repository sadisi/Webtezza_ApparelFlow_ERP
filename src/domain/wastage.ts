/**
 * Domain: Fabric Wastage Calculation
 *
 * Implements standard fabric usage expectation and fabric wastage percentage calculations.
 *
 * Formulas:
 *   Expected Fabric (yards) = Standard Fabric Yards × Target Quantity
 *   Wastage % = ((Actual Fabric Used − Expected Fabric) ÷ Expected Fabric) × 100
 *
 * PRECISION STRATEGY:
 *   All resulting percentages and yards are rounded to 2 decimal places using standard
 *   banker's / half-up rounding (Math.round(val * 100) / 100).
 */

import { InvalidQuantityError } from './errors';

/**
 * Calculates expected fabric in yards for a cutting batch.
 *
 * @param standardFabricYards Standard fabric consumption in yards per garment (positive number)
 * @param targetQuantity Target garment count in cutting order (positive integer)
 * @returns Expected fabric requirement in yards (rounded to 2 decimal places)
 * @throws InvalidQuantityError if inputs are invalid or <= 0
 */
export function calculateExpectedFabric(
  standardFabricYards: number,
  targetQuantity: number,
): number {
  if (
    typeof standardFabricYards !== 'number' ||
    !Number.isFinite(standardFabricYards) ||
    standardFabricYards <= 0
  ) {
    throw new InvalidQuantityError(
      `Standard fabric yards must be greater than zero, received: ${standardFabricYards}`,
    );
  }

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

  const rawExpected = standardFabricYards * targetQuantity;
  return Math.round(rawExpected * 100) / 100;
}

/**
 * Calculates fabric wastage percentage against expected consumption.
 *
 * @param actualFabricUsed Total fabric yards consumed by cutting (non-negative number)
 * @param expectedFabric Total expected fabric yards for batch (positive number)
 * @returns Wastage percentage (positive = excess consumption, negative = savings, rounded to 2 decimal places)
 * @throws InvalidQuantityError if inputs are invalid or expected fabric is <= 0
 */
export function calculateWastagePct(
  actualFabricUsed: number,
  expectedFabric: number,
): number {
  if (
    typeof expectedFabric !== 'number' ||
    !Number.isFinite(expectedFabric) ||
    expectedFabric <= 0
  ) {
    throw new InvalidQuantityError(
      `Expected fabric yards must be greater than zero, received: ${expectedFabric}`,
    );
  }

  if (
    typeof actualFabricUsed !== 'number' ||
    !Number.isFinite(actualFabricUsed) ||
    actualFabricUsed < 0
  ) {
    throw new InvalidQuantityError(
      `Actual fabric used cannot be negative or invalid, received: ${actualFabricUsed}`,
    );
  }

  const rawWastage = ((actualFabricUsed - expectedFabric) / expectedFabric) * 100;
  return Math.round(rawWastage * 100) / 100;
}

/**
 * Checks if a calculated wastage percentage exceeds a recipe's maximum wastage cap.
 *
 * @param wastagePct Calculated fabric wastage percentage
 * @param wastageCapPct Recipe wastage threshold cap percentage (e.g. 5.0 for 5%)
 * @returns true if wastage exceeds cap, false otherwise
 */
export function isWastageExceeded(
  wastagePct: number,
  wastageCapPct: number,
): boolean {
  if (
    typeof wastagePct !== 'number' ||
    !Number.isFinite(wastagePct) ||
    typeof wastageCapPct !== 'number' ||
    !Number.isFinite(wastageCapPct)
  ) {
    return false;
  }

  return wastagePct > wastageCapPct;
}
