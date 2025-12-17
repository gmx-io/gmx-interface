export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export function sleepWithSignal(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const abortHandler = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abortHandler);
      reject(createAbortError());
    };

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abortHandler);
      resolve();
    }, ms);

    signal.addEventListener("abort", abortHandler);
  });
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Sleep aborted", "AbortError");
  }

  const error = new Error("Sleep aborted");
  error.name = "AbortError";
  return error;
}
