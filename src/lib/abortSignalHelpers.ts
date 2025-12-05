export function createTimeoutSignal(timeout: number): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
  });

  return controller.signal;
}

export function createAnySignal(signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  const filteredSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);

  if (filteredSignals.length === 0) {
    return controller.signal;
  }

  if (filteredSignals.some((signal) => signal.aborted)) {
    controller.abort();
    return controller.signal;
  }

  const handler = () => {
    controller.abort();
    filteredSignals.forEach((signal) => {
      signal.removeEventListener("abort", handler);
    });
  };

  filteredSignals.forEach((signal) => {
    signal.addEventListener("abort", handler);
  });

  controller.signal.addEventListener("abort", () => {
    filteredSignals.forEach((signal) => {
      signal.removeEventListener("abort", handler);
    });
  });

  return controller.signal;
}
