export function throwError(err: unknown) {
  if (err instanceof Error && err.message) alert(err.message);
  else if (typeof err === 'string') alert(err);
  else alert(JSON.stringify(err));
}
