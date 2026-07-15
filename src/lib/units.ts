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
