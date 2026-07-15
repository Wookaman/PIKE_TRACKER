import { aggregateMuscles } from './muscles';
import { ALL_MUSCLES, MUSCLE_LABELS } from './types';

describe('muscle constants', () => {
  it('defines 14 unique muscle ids', () => {
    expect(ALL_MUSCLES).toHaveLength(14);
    expect(new Set(ALL_MUSCLES).size).toBe(14);
  });

  it('labels every muscle', () => {
    for (const id of ALL_MUSCLES) {
      expect(MUSCLE_LABELS[id]).toBeTruthy();
    }
  });
});

describe('aggregateMuscles', () => {
  it('returns empty for no workouts', () => {
    expect(aggregateMuscles([])).toEqual({});
  });

  it('unions muscles across workouts', () => {
    const result = aggregateMuscles([
      { primary: ['chest'], secondary: ['triceps'] },
      { primary: ['quads'], secondary: ['glutes'] },
    ]);
    expect(result.chest).toBe('primary');
    expect(result.quads).toBe('primary');
    expect(result.triceps).toBe('secondary');
    expect(result.glutes).toBe('secondary');
  });

  it('lets primary win over secondary regardless of order', () => {
    const result = aggregateMuscles([
      { primary: [], secondary: ['chest'] },
      { primary: ['chest'], secondary: [] },
    ]);
    expect(result.chest).toBe('primary');

    const reversed = aggregateMuscles([
      { primary: ['chest'], secondary: [] },
      { primary: [], secondary: ['chest'] },
    ]);
    expect(reversed.chest).toBe('primary');
  });
});
