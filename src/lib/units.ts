import { Unit } from './types';

const GRAMS_PER_OZ = 28.35;

export function gramsFor(qty: number, unit: Unit): number {
  switch (unit.kind) {
    case 'g':
      return qty;
    case 'oz':
      return qty * GRAMS_PER_OZ;
    case 'serving':
      return qty * unit.serving.grams;
  }
}

export function unitLabel(unit: Unit): string {
  switch (unit.kind) {
    case 'g':
      return 'g';
    case 'oz':
      return 'oz';
    case 'serving':
      return unit.serving.label;
  }
}

// ---- Bodyweight units -------------------------------------------------
// Bodyweight is stored canonically in kg; `weightUnit` only controls display.

export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Canonical kg -> the user's display unit, rounded to 1 decimal. */
export function displayWeight(kg: number, unit: string): number {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(value * 10) / 10;
}

/** A typed value in the user's unit -> canonical kg. */
export function toCanonicalKg(value: number, unit: string): number {
  return unit === 'lb' ? lbToKg(value) : value;
}
