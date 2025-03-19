import isPlainObject from "lodash/isPlainObject";

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

export function deleteByKey<T>(obj: { [key: string]: T }, key: string) {
  const newObj = { ...obj };
  delete newObj[key];
  return newObj;
}

export function objectKeysDeep(obj: Record<string, any>, depth = 1): string[] {
  const keys = new Set<string>();

  const scanQueue: {
    obj: Record<string, any>;
    currentDepth: number;
  }[] = [{ obj, currentDepth: 0 }];

  while (scanQueue.length > 0) {
    const { obj, currentDepth } = scanQueue.pop()!;

    if (currentDepth > depth) {
      continue;
    }

    for (const key of Object.keys(obj)) {
      keys.add(key);

      if (isPlainObject(obj[key])) {
        scanQueue.push({ obj: obj[key], currentDepth: currentDepth + 1 });
      }
    }
  }

  return Array.from(keys);
}
