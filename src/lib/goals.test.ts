import { Activity, bmrMifflin, computeGoals } from './goals';

describe('bmrMifflin', () => {
  it('male: 10w + 6.25h - 5a + 5', () => {
    expect(bmrMifflin(80, 180, 30, 'male')).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5); // 1780
  });
  it('female: 10w + 6.25h - 5a - 161', () => {
    expect(bmrMifflin(60, 165, 25, 'female')).toBeCloseTo(10 * 60 + 6.25 * 165 - 5 * 25 - 161, 5); // 1345.25
  });
});

describe('computeGoals', () => {
  it('applies activity factor and whole-number kcal (moderate)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate' });
    expect(g.kcal).toBe(Math.round(1780 * 1.55)); // 2759
  });
  it('defaults missing activity to sedentary (1.2)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' });
    expect(g.kcal).toBe(Math.round(1780 * 1.2)); // 2136
  });
  it('splits macros 30/40/30 into grams (4/4/9 kcal per g)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'sedentary' });
    const kcal = g.kcal; // 2136
    expect(g.protein).toBe(Math.round((kcal * 0.3) / 4));
    expect(g.carbs).toBe(Math.round((kcal * 0.4) / 4));
    expect(g.fat).toBe(Math.round((kcal * 0.3) / 9));
  });
  it('every activity factor is applied', () => {
    const base = { weightKg: 70, heightCm: 175, age: 28, sex: 'female' as const };
    const bmr = bmrMifflin(70, 175, 28, 'female');
    const factors: [Activity, number][] = [
      ['sedentary', 1.2],
      ['light', 1.375],
      ['moderate', 1.55],
      ['active', 1.725],
      ['very_active', 1.9],
    ];
    for (const [a, f] of factors) {
      expect(computeGoals({ ...base, activity: a }).kcal).toBe(Math.round(bmr * f));
    }
  });
});
