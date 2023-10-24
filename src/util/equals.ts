import { assert } from './assert';

export function keys(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): string[] {
  const k1 = Object.keys(a).concat(Object.keys(b));
  const keys2 = k1.filter((k, i) => k1.indexOf(k) === i);
  return keys2;
}

export function equals(a: unknown, b: unknown) {
  // eslint-disable-next-line no-self-compare
  if (a === b || (a !== a && b !== b)) return true;
  if (!a || !b) return false;
  assert(a);
  assert(b);
  if (typeof a === 'object' && typeof b === 'object') {
    const keys2 = keys(
      a as Record<string, unknown>,
      b as Record<string, unknown>,
    );
    for (const i of keys2) {
      if (!equals(a[i], b[i])) return false;
    }
    return true;
  }
  if (
    typeof a === 'number' &&
    Number.isNaN(a) &&
    typeof b === 'number' &&
    Number.isNaN(b)
  )
    return true;
  return false;
}
