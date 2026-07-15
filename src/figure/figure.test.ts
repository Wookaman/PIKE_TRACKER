import { ALL_MUSCLES } from '../lib/types';
import { BACK, FRONT } from './bodyPolygons';

describe('body polygons', () => {
  const all = [...FRONT, ...BACK];

  it('uses only canonical muscle ids or silhouette', () => {
    const valid = new Set<string>([...ALL_MUSCLES, 'silhouette']);
    for (const poly of all) {
      if (!valid.has(poly.muscle)) throw new Error(`bad muscle: ${poly.muscle}`);
    }
  });

  it('covers all 14 muscles across both views', () => {
    const covered = new Set(all.map((p) => p.muscle));
    for (const m of ALL_MUSCLES) {
      if (!covered.has(m)) throw new Error(`figure misses ${m}`);
    }
  });

  it('has parseable polygon points inside the viewbox', () => {
    for (const poly of all) {
      const nums = poly.points.split(/[,\s]+/).map(Number);
      expect(nums.length).toBeGreaterThanOrEqual(6);
      expect(nums.length % 2).toBe(0);
      for (let i = 0; i < nums.length; i += 2) {
        expect(nums[i]).toBeGreaterThanOrEqual(0);
        expect(nums[i]).toBeLessThanOrEqual(100);
        expect(nums[i + 1]).toBeGreaterThanOrEqual(0);
        expect(nums[i + 1]).toBeLessThanOrEqual(220);
      }
    }
  });
});
