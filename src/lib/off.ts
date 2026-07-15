import { Per100 } from './types';

export interface OffFood {
  name: string;
  brand?: string;
  barcode?: string;
  per100: Per100;
}

const KJ_PER_KCAL = 4.184;

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * Map one Open Food Facts product to a food. Returns null unless the product
 * has a name, energy, and all three macros — partial data would corrupt logs.
 */
export function mapOffProduct(raw: unknown): OffFood | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;

  const name = typeof p.product_name === 'string' ? p.product_name.trim() : '';
  if (!name) return null;

  if (typeof p.nutriments !== 'object' || p.nutriments === null) return null;
  const n = p.nutriments as Record<string, unknown>;

  const kcalDirect = num(n['energy-kcal_100g']);
  const kj = num(n['energy_100g']);
  const kcal = kcalDirect ?? (kj !== undefined ? Math.round(kj / KJ_PER_KCAL) : undefined);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }
  if (kcal < 0 || protein < 0 || carbs < 0 || fat < 0) return null;

  const sodiumG = num(n['sodium_100g']);
  const brand = typeof p.brands === 'string' && p.brands.trim() ? p.brands.trim() : undefined;
  const barcode = typeof p.code === 'string' && p.code ? p.code : undefined;

  return {
    name,
    brand,
    barcode,
    per100: {
      kcal,
      protein,
      carbs,
      fat,
      fiber: num(n['fiber_100g']),
      sugar: num(n['sugars_100g']),
      sodiumMg: sodiumG !== undefined ? Math.round(sodiumG * 1000) : undefined,
    },
  };
}
