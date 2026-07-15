import { Macros, Per100 } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Scale per-100g values to an amount. kcal whole, macros one decimal. */
export function macrosForGrams(per100: Per100, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: round1(per100.protein * f),
    carbs: round1(per100.carbs * f),
    fat: round1(per100.fat * f),
  };
}

export function sumMacros(items: Macros[]): Macros {
  const total = items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { ...total, protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) };
}

export function recipeTotals(items: { per100: Per100; grams: number }[]): Macros {
  return sumMacros(items.map((i) => macrosForGrams(i.per100, i.grams)));
}

export function perServing(totals: Macros, servings: number): Macros {
  const n = servings >= 1 ? servings : 1;
  return {
    kcal: Math.round(totals.kcal / n),
    protein: round1(totals.protein / n),
    carbs: round1(totals.carbs / n),
    fat: round1(totals.fat / n),
  };
}
