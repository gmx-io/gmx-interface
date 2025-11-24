export function combineAbortSignals(...signals: AbortSignal[]): AbortController {
  const controller = new AbortController();

  const abortHandler = () => {
    for (const signal of signals) {
      signal.removeEventListener("abort", abortHandler);
    }
    controller.abort();
  };

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller;
    }
    signal.addEventListener("abort", abortHandler);
  }

  controller.signal.addEventListener("abort", () => {
    for (const signal of signals) {
      signal.removeEventListener("abort", abortHandler);
    }
  });

  return controller;
}
