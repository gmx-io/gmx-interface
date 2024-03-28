export const mustNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${x}`);
};

export const assertDefined = <T>(x: T | undefined): T => {
  if (x === undefined) throw new Error(`Expected defined value, got undefined`);
  return x;
};
