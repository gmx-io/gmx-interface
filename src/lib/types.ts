export const museNeverExist = (x: never): never => {
  throw new Error(`Must never exist: ${x}`);
};
