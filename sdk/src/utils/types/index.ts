export const mustNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${x}`);
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
