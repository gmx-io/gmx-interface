// Polyfill implementations
if (typeof AggregateError === "undefined") {
  class AggregateError extends Error {
    errors: any[];

    constructor(errors: any[], message?: string) {
      super(message || "");
      this.name = "AggregateError";
      this.errors = errors;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, AggregateError);
      }
    }
  }

  globalThis.AggregateError = AggregateError as unknown as AggregateErrorConstructor;
}

Array.prototype.at = function at<T>(this: T[], n: number): T | undefined {
  n = Math.trunc(n) || 0;
  if (n < 0) n += this.length;
  if (n < 0 || n >= this.length) return undefined;
  return this[n];
};

Array.prototype.flat = function flat<A, D extends number = 1>(this: A, depth = 1): FlatArray<A, D>[] {
  const flatten = (arr: any[], depth: number): any[] => {
    return depth > 0
      ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), [])
      : arr.slice();
  };
  return flatten(this as any[], depth);
};

Array.prototype.flatMap = function flatMap<T, U, This = undefined>(
  this: T[],
  callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>,
  thisArg?: This
): U[] {
  return this.map(callback, thisArg).flat(1) as U[];
};

Array.prototype.findLastIndex = function findLastIndex<T>(
  this: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
  thisArg?: any
): number {
  if (typeof predicate !== "function") {
    throw new TypeError("predicate must be a function");
  }

  const length = this.length;
  for (let i = length - 1; i >= 0; i--) {
    if (i in this && predicate.call(thisArg, this[i], i, this)) {
      return i;
    }
  }
  return -1;
};

Object.fromEntries = function fromEntries<T>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T } {
  if (!entries || !entries[Symbol.iterator]) {
    throw new TypeError("Object.fromEntries requires a single iterable argument");
  }

  const obj: { [k: string]: T } = {};

  for (const [key, value] of entries) {
    obj[key as string] = value;
  }

  return obj;
};

Promise.any = function any<T>(promises: Iterable<T | PromiseLike<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    const promisesArray = Array.from(promises);
    if (promisesArray.length === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }

    const errors: any[] = [];
    let remainingPromises = promisesArray.length;

    promisesArray.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => {
          resolve(value);
        },
        (error) => {
          errors[index] = error;
          remainingPromises--;
          if (remainingPromises === 0) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        }
      );
    });
  });
};

Promise.allSettled = function allSettled<T>(
  promises: Iterable<T | PromiseLike<T>>
): Promise<Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: any }>> {
  return new Promise((resolve) => {
    const promisesArray = Array.from(promises);
    const results: Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: any }> = [];
    let completed = 0;

    if (promisesArray.length === 0) {
      resolve([]);
      return;
    }

    promisesArray.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => {
          results[index] = { status: "fulfilled", value };
          completed++;
          if (completed === promisesArray.length) {
            resolve(results);
          }
        },
        (reason) => {
          results[index] = { status: "rejected", reason };
          completed++;
          if (completed === promisesArray.length) {
            resolve(results);
          }
        }
      );
    });
  });
};

Promise.withResolvers = function withResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
