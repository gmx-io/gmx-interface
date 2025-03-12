export const mustNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${x}`);
};

export const assertDefined = <T>(x: T | undefined): T => {
  if (x === undefined) throw new Error(`Expected defined value, got undefined`);
  return x;
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
