// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortBy<T>(a1: T[], func: (v: T) => any, reverse = false) {
  const a2 = [...a1];
  const direction = reverse ? -1 : 1;
  a2.sort((a, b) => {
    const aVal = func(a);
    const bVal = func(b);
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction * aVal.localeCompare(bVal);
    }
    if (!aVal) return -direction;
    if (!bVal) return direction;
    if ((Number.isNaN(aVal) && Number.isNaN(bVal)) || aVal === bVal) return 0;
    if (typeof aVal !== typeof bVal) {
      return typeof aVal < typeof bVal ? -direction : direction;
    }
    return aVal < bVal ? -direction : aVal > bVal ? direction : 0;
  });

  return a2;
}
