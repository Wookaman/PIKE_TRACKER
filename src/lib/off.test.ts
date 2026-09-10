import { mapOffProduct } from './off';

const complete = {
  product_name: 'Peanut Butter Crunchy',
  brands: 'NuttyCo',
  code: '00123456',
  nutriments: {
    'energy-kcal_100g': 588,
    proteins_100g: 25.1,
    carbohydrates_100g: 19.6,
    fat_100g: 50.4,
    fiber_100g: 6,
    sugars_100g: 9.2,
    sodium_100g: 0.43,
  },
};

describe('mapOffProduct', () => {
  it('maps a complete product', () => {
    const food = mapOffProduct(complete);
    expect(food).toEqual({
      name: 'Peanut Butter Crunchy',
      brand: 'NuttyCo',
      barcode: '00123456',
      per100: {
        kcal: 588,
        protein: 25.1,
        carbs: 19.6,
        fat: 50.4,
        fiber: 6,
        sugar: 9.2,
        sodiumMg: 430,
      },
      micros: [
        { label: 'Fiber', amount: 6, unit: 'g' },
        { label: 'Sugars', amount: 9.2, unit: 'g' },
        { label: 'Sodium', amount: 430, unit: 'mg' },
      ],
    });
  });

  it('derives kcal from kJ when kcal is missing', () => {
    const kj = {
      ...complete,
      nutriments: { ...complete.nutriments, 'energy-kcal_100g': undefined, energy_100g: 1046 },
    };
    expect(mapOffProduct(kj)?.per100.kcal).toBe(250);
  });

  it('rejects products without a name', () => {
    expect(mapOffProduct({ ...complete, product_name: '  ' })).toBeNull();
  });

  it('rejects products missing macros', () => {
    const broken = {
      ...complete,
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5, fat_100g: 2 },
    };
    expect(mapOffProduct(broken)).toBeNull();
  });

  it('rejects junk input', () => {
    expect(mapOffProduct(null)).toBeNull();
    expect(mapOffProduct('nope')).toBeNull();
    expect(mapOffProduct({ product_name: 'X', nutriments: 'bad' })).toBeNull();
  });

  it('omits brand and optionals when absent', () => {
    const bare = {
      product_name: 'Water Crackers',
      nutriments: {
        'energy-kcal_100g': 400,
        proteins_100g: 9,
        carbohydrates_100g: 80,
        fat_100g: 5,
      },
    };
    const food = mapOffProduct(bare);
    expect(food?.brand).toBeUndefined();
    expect(food?.per100.fiber).toBeUndefined();
    expect(food?.per100.sodiumMg).toBeUndefined();
  });
});

describe('mapOffProduct micros', () => {
  const base = {
    product_name: 'Test bar',
    nutriments: {
      'energy-kcal_100g': 400,
      proteins_100g: 20,
      carbohydrates_100g: 40,
      fat_100g: 15,
      'saturated-fat_100g': 6,
      sodium_100g: 0.4,
      calcium_100g: 0.12,
      'vitamin-c_100g': 0.06,
      'vitamin-a_100g': 0.0008,
    },
  };

  it('extracts curated micronutrients with display units and scaling', () => {
    const micros = mapOffProduct(base)!.micros;
    const byLabel = Object.fromEntries(micros.map((m) => [m.label, m]));
    expect(byLabel['Saturated fat']).toEqual({ label: 'Saturated fat', amount: 6, unit: 'g' });
    expect(byLabel['Sodium']).toEqual({ label: 'Sodium', amount: 400, unit: 'mg' });
    expect(byLabel['Calcium']).toEqual({ label: 'Calcium', amount: 120, unit: 'mg' });
    expect(byLabel['Vitamin C']).toEqual({ label: 'Vitamin C', amount: 60, unit: 'mg' });
    expect(byLabel['Vitamin A']).toEqual({ label: 'Vitamin A', amount: 800, unit: 'µg' });
  });

  it('omits absent micronutrients and returns [] when none present', () => {
    const micros = mapOffProduct({
      product_name: 'Plain',
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 },
    })!.micros;
    expect(micros).toEqual([]);
  });

  it('rounds micro amounts to at most 2 decimals', () => {
    const micros = mapOffProduct({
      product_name: 'Rnd',
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1, iron_100g: 0.0000123 },
    })!.micros;
    expect(micros.find((m) => m.label === 'Iron')?.amount).toBe(0.01);
  });
});
