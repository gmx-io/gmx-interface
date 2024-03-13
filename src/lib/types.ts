export const mustNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${x}`);
};
