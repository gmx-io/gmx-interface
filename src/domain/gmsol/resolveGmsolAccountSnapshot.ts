export function resolveGmsolAccountSnapshot<T>({
  keys,
  data,
  previousData,
}: {
  keys: string[];
  data: Record<string, T>;
  previousData: Record<string, T> | undefined;
}): { data: Record<string, T>; isIncomplete: boolean } {
  const missingKeys = keys.filter((key) => data[key] === undefined);

  if (missingKeys.length === 0) {
    return { data, isIncomplete: false };
  }

  const retained = { ...data };
  for (const key of missingKeys) {
    if (previousData?.[key] !== undefined) {
      retained[key] = previousData[key];
    }
  }

  return { data: retained, isIncomplete: true };
}
