import { fetchOffByBarcode } from './offSearch';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function stubFetch(body: unknown, ok = true) {
  global.fetch = jest.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

describe('fetchOffByBarcode', () => {
  it('maps a found product (status 1)', async () => {
    stubFetch({
      status: 1,
      product: {
        product_name: 'Cola',
        brands: 'BrandCo',
        code: '5449000000996',
        nutriments: {
          'energy-kcal_100g': 42,
          proteins_100g: 0,
          carbohydrates_100g: 10.6,
          fat_100g: 0,
          sugars_100g: 10.6,
        },
      },
    });
    const food = await fetchOffByBarcode('5449000000996');
    expect(food?.name).toBe('Cola');
    expect(food?.barcode).toBe('5449000000996');
    expect(food?.micros.find((m) => m.label === 'Sugars')?.amount).toBe(10.6);
  });

  it('returns null when not found (status 0)', async () => {
    stubFetch({ status: 0 });
    expect(await fetchOffByBarcode('0000')).toBeNull();
  });
});
