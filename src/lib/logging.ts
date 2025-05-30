import throttle from "lodash/throttle";

export const throttleLog = throttle(
  (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log(...args);
  },
  1000,
  { leading: true, trailing: true }
);
