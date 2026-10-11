import { describe, expect, it } from 'vitest';
import { fitZoom, measureDistance } from '$lib/measure';

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

describe('fitZoom', () => {
  it('wide pano binds to frame width', () => {
    // 2976x1536 in a 800x608 box -> (800-24)/2976
    expect(fitZoom(800, 608, 2976, 1536)).toBeCloseTo(776 / 2976, 9);
  });

  it('tall image binds to box height, not empty-frame height', () => {
    // 1000x2000 in a 800x608 box -> (608-24)/2000, even if frame measures 320 tall
    expect(fitZoom(800, 608, 1000, 2000)).toBeCloseTo(584 / 2000, 9);
  });

  it('caps tiny images at max zoom', () => {
    expect(fitZoom(800, 608, 64, 64)).toBe(8);
  });

  it('floors huge images at min zoom', () => {
    expect(fitZoom(800, 608, 100000, 100000)).toBe(0.15);
  });
});
