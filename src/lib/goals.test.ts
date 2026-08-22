import {
  bmrMifflin,
  computeGoals,
  clampRate,
  isRateAllowed,
  parseRate,
  rateLabel,
  RATE_OPTIONS,
  targetKcal,
  tdee,
} from './goals';

describe('bmrMifflin', () => {
  it('male: 10w + 6.25h - 5a + 5', () => {
    expect(bmrMifflin(80, 180, 30, 'male')).toBeCloseTo(1780, 5);
  });
  it('female: 10w + 6.25h - 5a - 161', () => {
    expect(bmrMifflin(60, 165, 25, 'female')).toBeCloseTo(1345.25, 5);
  });
});

describe('tdee', () => {
  it('applies the activity factor', () => {
    // 1780 BMR x 1.55 moderate
    expect(tdee({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate' })).toBeCloseTo(2759, 5);
  });

  it('defaults a missing activity to sedentary (1.2)', () => {
    expect(tdee({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBeCloseTo(2136, 5);
  });
});

describe('targetKcal', () => {
  it('shifts by 500 kcal per lb/week (3500 / 7)', () => {
    expect(targetKcal(2000, 0)).toBe(2000);
    expect(targetKcal(2000, -0.25)).toBe(1875);
    expect(targetKcal(2000, -0.5)).toBe(1750);
    expect(targetKcal(2000, -0.75)).toBe(1625);
    expect(targetKcal(2000, -1)).toBe(1500);
    expect(targetKcal(2000, 0.25)).toBe(2125);
    expect(targetKcal(2000, 0.5)).toBe(2250);
    expect(targetKcal(2000, 0.75)).toBe(2375);
    expect(targetKcal(2000, 1)).toBe(2500);
  });

  it('offers nine rates from -1 to +1', () => {
    expect(RATE_OPTIONS).toEqual([-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]);
  });
});

describe('isRateAllowed', () => {
  // 55kg / 160cm / 45 / female / sedentary -> BMR 1164, TDEE 1396.8
  const smallFemaleTdee = tdee({ weightKg: 55, heightCm: 160, age: 45, sex: 'female', activity: 'sedentary' });

  it('blocks deficits that fall under the female floor (1200)', () => {
    expect(isRateAllowed(smallFemaleTdee, -1, 'female')).toBe(false); // 897
    expect(isRateAllowed(smallFemaleTdee, -0.5, 'female')).toBe(false); // 1147
    expect(isRateAllowed(smallFemaleTdee, -0.25, 'female')).toBe(true); // 1272
  });

  it('uses the higher male floor (1500)', () => {
    // 70kg / 175cm / 30 / male / sedentary -> BMR 1648.75, TDEE 1978.5
    const t = tdee({ weightKg: 70, heightCm: 175, age: 30, sex: 'male', activity: 'sedentary' });
    expect(isRateAllowed(t, -1, 'male')).toBe(false); // 1479
    expect(isRateAllowed(t, -0.75, 'male')).toBe(true); // 1604
  });

  it('never blocks maintain or gain, even for a very low TDEE', () => {
    expect(isRateAllowed(900, 0, 'female')).toBe(true);
    expect(isRateAllowed(900, 1, 'female')).toBe(true);
  });
});

describe('computeGoals', () => {
  it('omitting the rate leaves the target at maintenance', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate' });
    expect(g.kcal).toBe(2759);
  });

  it('applies the rate to the target', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate', rate: -0.5 });
    expect(g.kcal).toBe(2509);
  });

  it('anchors protein to bodyweight and splits the remainder 4:3 carbs:fat', () => {
    // 80kg = 176.37 lb, sedentary target 2136.
    // protein 176.37g (705.5 kcal) -> remainder 1430.5 -> carbs 4/7, fat 3/7
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'sedentary' });
    expect(g.kcal).toBe(2136);
    expect(g.protein).toBe(176);
    expect(g.carbs).toBe(204);
    expect(g.fat).toBe(68);
  });

  it('caps protein at 40% of calories for a heavy person on a deficit', () => {
    // 113.4kg = 250 lb, TDEE 2097.6, rate -1 -> 1598.
    // 1g/lb would be 250g (626% over cap); cap = 1598 * 0.4 / 4 = 159.8g
    const g = computeGoals({ weightKg: 113.4, heightCm: 160, age: 45, sex: 'female', activity: 'sedentary', rate: -1 });
    expect(g.kcal).toBe(1598);
    expect(g.protein).toBe(160);
    expect(g.carbs).toBe(137);
    expect(g.fat).toBe(46);
  });
});

describe('rateLabel', () => {
  it('labels in lb', () => {
    expect(rateLabel(0, 'lb')).toBe('MAINTAIN');
    expect(rateLabel(-0.5, 'lb')).toBe('LOSE 0.5 LB/WK');
    expect(rateLabel(1, 'lb')).toBe('GAIN 1 LB/WK');
  });

  it('converts the magnitude for kg users', () => {
    expect(rateLabel(-0.5, 'kg')).toBe('LOSE 0.23 KG/WK');
    expect(rateLabel(1, 'kg')).toBe('GAIN 0.45 KG/WK');
    expect(rateLabel(0, 'kg')).toBe('MAINTAIN');
  });
});

describe('parseRate', () => {
  it('round-trips a stored rate', () => {
    expect(parseRate('-0.5')).toBe(-0.5);
    expect(parseRate('1')).toBe(1);
    expect(parseRate('0')).toBe(0);
  });

  it('falls back to maintain for missing or bogus values', () => {
    expect(parseRate(undefined)).toBe(0);
    expect(parseRate('')).toBe(0);
    expect(parseRate('-0.4')).toBe(0);
    expect(parseRate('nonsense')).toBe(0);
  });
});

describe('clampRate', () => {
  // 55kg / 160cm / 45 / female / sedentary -> TDEE 1396.8, floor 1200
  const smallFemaleTdee = tdee({ weightKg: 55, heightCm: 160, age: 45, sex: 'female', activity: 'sedentary' });

  it('leaves an allowed rate alone', () => {
    expect(clampRate(smallFemaleTdee, -0.25, 'female')).toBe(-0.25);
    expect(clampRate(smallFemaleTdee, 1, 'female')).toBe(1);
  });

  it('steps an unsafe deficit up to the least aggressive allowed rate', () => {
    // -1, -0.75 and -0.5 all land under 1200; -0.25 gives 1272
    expect(clampRate(smallFemaleTdee, -1, 'female')).toBe(-0.25);
    expect(clampRate(smallFemaleTdee, -0.5, 'female')).toBe(-0.25);
  });

  it('falls back to maintain when no deficit fits', () => {
    expect(clampRate(900, -1, 'female')).toBe(0);
  });
});
