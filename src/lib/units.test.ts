import { gramsFor, unitLabel } from './units';
import { Unit } from './types';

const slice: Unit = { kind: 'serving', serving: { label: '1 slice', grams: 28 } };

describe('gramsFor', () => {
  it('passes grams through', () => {
    expect(gramsFor(150, { kind: 'g' })).toBe(150);
  });

  it('converts ounces at 28.35 g/oz', () => {
    expect(gramsFor(2, { kind: 'oz' })).toBeCloseTo(56.7);
  });

  it('multiplies serving grams by quantity', () => {
    expect(gramsFor(2, slice)).toBe(56);
  });
});

describe('unitLabel', () => {
  it('labels grams', () => {
    expect(unitLabel({ kind: 'g' })).toBe('g');
  });

  it('labels ounces', () => {
    expect(unitLabel({ kind: 'oz' })).toBe('oz');
  });

  it('uses the serving label', () => {
    expect(unitLabel(slice)).toBe('1 slice');
  });
});
