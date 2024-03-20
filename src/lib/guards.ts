export function definedOrThrow<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error("Item is null or undefined");
  }
}

export function defined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}
