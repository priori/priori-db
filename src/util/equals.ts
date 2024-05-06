export function equals(a: unknown, b: unknown) {
  // eslint-disable-next-line no-self-compare
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (!a || !b) return false;
  if (typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!equals(a[i], b[i])) return false;
      }
      return true;
    }
    if (a instanceof Date && b instanceof Date)
      return a.getTime() === b.getTime();
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (
        !Object.prototype.hasOwnProperty.call(b, key) ||
        !equals(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      )
        return false;
    }
    return true;
  }
  return false;
}
