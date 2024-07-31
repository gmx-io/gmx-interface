export async function sequentialTimedScheduler<T>(runner: () => Promise<T> | T, interval: number, cb: () => void) {
  const start = Date.now();

  try {
    return await runner();
  } finally {
    const end = Date.now();
    const duration = end - start;

    const wait = Math.max(interval - duration, 0);

    setTimeout(() => {
      cb();
    }, wait);
  }
}
