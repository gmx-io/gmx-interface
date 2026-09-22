import { isNumberParts, joinNumberParts } from "lib/numbers";

export function withPlainText<T>(value: T): T {
  if (isNumberParts(value)) {
    return joinNumberParts(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(withPlainText) as T;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => [key, withPlainText(item)]);

    if (entries.length === 1 && entries[0][0] === "text") {
      return entries[0][1] as T;
    }

    return Object.fromEntries(entries) as T;
  }

  return value;
}
