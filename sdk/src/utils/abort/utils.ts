export function combineAbortSignals(...signals: AbortSignal[]): AbortController {
  const controller = new AbortController();

  const abortHandler = () => {
    for (const signal of signals) {
      signal.removeEventListener("abort", abortHandler);
    }
    controller.abort();
  };

  const signalsWithListeners: AbortSignal[] = [];

  for (const signal of signals) {
    if (signal.aborted) {
      for (const signalWithListener of signalsWithListeners) {
        signalWithListener.removeEventListener("abort", abortHandler);
      }
      controller.abort();
      return controller;
    }
    signal.addEventListener("abort", abortHandler);
    signalsWithListeners.push(signal);
  }

  controller.signal.addEventListener("abort", () => {
    for (const signal of signals) {
      signal.removeEventListener("abort", abortHandler);
    }
  });

  return controller;
}
