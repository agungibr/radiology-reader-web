import { describe, expect, it } from 'vitest';

// Infra smoke test: proves the vitest runner works.
// Real behavior tests live in tests/dose|drl|calibration.test.ts (Tasks 2-3).
describe('test infra', () => {
  it('runs a trivial assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
