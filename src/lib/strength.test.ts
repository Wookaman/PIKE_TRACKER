import { epley1RM, sessionE1RM } from './strength';

describe('epley1RM', () => {
  it('returns the weight itself for a single rep', () => {
    expect(epley1RM(1, 100)).toBeCloseTo(100 + 100 / 30);
  });

  it('scales up with reps (Epley)', () => {
    // 5 reps @ 100 = 100 * (1 + 5/30) = 116.67
    expect(epley1RM(5, 100)).toBeCloseTo(116.667, 2);
  });

  it('is zero for zero weight', () => {
    expect(epley1RM(8, 0)).toBe(0);
  });
});

describe('sessionE1RM', () => {
  it('returns the best set estimate, not the heaviest weight alone', () => {
    // 5x100 -> 116.67 ; 3x105 -> 115.5 -> best is the 5x100 set
    const best = sessionE1RM([
      { reps: 5, weight: 100 },
      { reps: 3, weight: 105 },
    ]);
    expect(best).toBeCloseTo(116.667, 2);
  });

  it('returns 0 for no sets', () => {
    expect(sessionE1RM([])).toBe(0);
  });
});
