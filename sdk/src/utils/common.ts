declare global {
  interface AbortSignal {
    addEventListener(type: "abort", listener: () => void): void;
  }
}

export const sleep = (ms: number, abortController?: AbortController) =>
  new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);

    if (abortController) {
      abortController.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    }
  });

export const TIMEZONE_OFFSET_SEC = -new Date().getTimezoneOffset() * 60;
