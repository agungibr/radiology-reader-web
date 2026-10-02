import { describe, expect, it } from 'vitest';
import { measureDistance } from '$lib/measure';

describe('measureDistance', () => {
  it('converts pixels to mm with spacing', () => {
    expect(measureDistance(3, 4, 0.5)).toEqual({ value: 2.5, unit: 'mm' });
  });

  it('falls back to px without spacing', () => {
    expect(measureDistance(3, 4, null)).toEqual({ value: 5, unit: 'px' });
  });

  it('handles zero distance', () => {
    expect(measureDistance(0, 0, 0.5)).toEqual({ value: 0, unit: 'mm' });
  });
});
