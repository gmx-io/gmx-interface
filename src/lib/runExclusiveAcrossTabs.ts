/** Runs `callback` while no other tab of this origin runs one under the same name. Without Web Locks it runs at once. */
export function runExclusiveAcrossTabs<T>(name: string, callback: () => Promise<T>): Promise<T> {
  if (!navigator.locks) {
    return callback();
  }

  return navigator.locks.request(name, callback);
}
