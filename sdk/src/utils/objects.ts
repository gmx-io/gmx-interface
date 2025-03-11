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
