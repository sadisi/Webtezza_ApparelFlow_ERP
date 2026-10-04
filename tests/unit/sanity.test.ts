/**
 * Sanity test — proves Vitest is wired up correctly.
 * This file will be replaced by real domain tests in Phase 3.
 */
import { describe, it, expect } from 'vitest';

describe('Test runner sanity', () => {
  it('should be able to run a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const appName = 'ApparelFlow ERP';
    expect(appName).toContain('ERP');
    expect(appName.toLowerCase()).toBe('apparelflow erp');
  });

  it('should handle array operations', () => {
    const statuses = [
      'CUTTING_IN_PROGRESS',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'REJECTED',
      'SEWING_IN_PROGRESS',
    ] as const;

    expect(statuses).toHaveLength(5);
    expect(statuses).toContain('VERIFIED');
    expect(statuses).not.toContain('APPROVED'); // not a valid status
  });
});
