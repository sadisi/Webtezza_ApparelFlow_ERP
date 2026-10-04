/**
 * Domain Layer Errors
 *
 * Domain-specific error classes for state transitions, quantity calculations,
 * traffic-light evaluation, and verification gate rules.
 *
 * Decoupled from HTTP framework (no NextResponse or status codes).
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidStateTransitionError extends DomainError {
  public readonly fromStatus: string;
  public readonly toStatus: string;

  constructor(fromStatus: string, toStatus: string) {
    super(
      `Invalid order state transition: Cannot transition from '${fromStatus}' to '${toStatus}'.`,
    );
    this.name = 'InvalidStateTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

export class InvalidQuantityError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQuantityError';
  }
}

export class VerificationGateError extends DomainError {
  public readonly reasons: string[];

  constructor(reasons: string[]) {
    super(
      `Verification gate approval blocked:\n${reasons.map((r) => `- ${r}`).join('\n')}`,
    );
    this.name = 'VerificationGateError';
    this.reasons = reasons;
  }
}
