declare global {
  interface AbortSignal {
    addEventListener(type: "abort", listener: () => void): void;
  }
}

export const sleep = (ms: number, abortSignal?: AbortSignal) =>
  new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    }
  });

export const TIMEZONE_OFFSET_SEC = -new Date().getTimezoneOffset() * 60;
