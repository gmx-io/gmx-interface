export type ITimers = {
  setTimeout: (cb: () => void, ms: number) => number;
  clearTimeout: (timeoutId: number) => void;
};
