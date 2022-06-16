export function grantError(err2: unknown) {
  if (typeof err2 === 'string' || typeof err2 === 'undefined')
    return new Error(err2);
  if (err2 instanceof Error) return err2;
  return new Error(`${err2}`);
}
