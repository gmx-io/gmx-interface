export function setByKey<T>(obj: { [key: string]: T }, key: string, data: T) {
  return { ...obj, [key]: data };
}

export function updateByKey<T>(obj: { [key: string]: T }, key: string, data: Partial<T>) {
  if (!obj[key]) return obj;

  return { ...obj, [key]: { ...obj[key], ...data } };
}

export function getByKey<T>(obj?: { [key: string]: T }, key?: string): T | undefined {
  if (!obj || !key) return undefined;

  return obj[key];
}

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
