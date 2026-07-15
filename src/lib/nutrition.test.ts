import { macrosForGrams, perServing, recipeTotals, sumMacros } from './nutrition';
import { Per100 } from './types';

const chicken: Per100 = { kcal: 165, protein: 31, carbs: 0, fat: 3.6 };
const rice: Per100 = { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 };

describe('macrosForGrams', () => {
  it('scales linearly from per-100g values', () => {
    const m = macrosForGrams(chicken, 150);
    expect(m.kcal).toBe(248); // 247.5 rounds to whole kcal
    expect(m.protein).toBe(46.5);
    expect(m.fat).toBe(5.4);
    expect(m.carbs).toBe(0);
  });

  it('returns zeros for zero grams', () => {
    expect(macrosForGrams(chicken, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('rounds macros to one decimal', () => {
    const m = macrosForGrams(rice, 33);
    expect(m.protein).toBe(0.9); // 0.891
    expect(m.carbs).toBe(9.3); // 9.306
  });
});

describe('sumMacros', () => {
  it('returns zeros for an empty list', () => {
    expect(sumMacros([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('adds entries and keeps one-decimal macros', () => {
    const total = sumMacros([macrosForGrams(chicken, 100), macrosForGrams(rice, 100)]);
    expect(total.kcal).toBe(295);
    expect(total.protein).toBe(33.7);
  });
});

describe('recipeTotals', () => {
  it('sums scaled ingredients', () => {
    const total = recipeTotals([
      { per100: chicken, grams: 200 },
      { per100: rice, grams: 150 },
    ]);
    expect(total.kcal).toBe(330 + 195);
    expect(total.protein).toBe(62 + 4.1);
  });
});

describe('perServing', () => {
  it('divides totals by servings', () => {
    const per = perServing({ kcal: 900, protein: 60, carbs: 90, fat: 30 }, 3);
    expect(per).toEqual({ kcal: 300, protein: 20, carbs: 30, fat: 10 });
  });

  it('treats servings below 1 as 1', () => {
    const totals = { kcal: 500, protein: 10, carbs: 20, fat: 5 };
    expect(perServing(totals, 0)).toEqual(totals);
  });
});
