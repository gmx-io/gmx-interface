export * from "sdk/utils/objects";

export function getMatchingValueFromObject(
  obj?: { [key: string]: string } | string[],
  value?: string
): string | undefined {
  if (!obj || !value) return;
  if (Array.isArray(obj)) {
    const matchingValue = obj.find((item) => item.toLowerCase() === value.toLowerCase());
    return matchingValue;
  } else {
    for (const key in obj) {
      if (obj[key].toLowerCase() === value.toLowerCase()) {
        return obj[key];
      }
    }
  }
}
export const EMPTY_OBJECT = {};

export const EMPTY_ARRAY = [];

export const EMPTY_SET = new Set<any>();
