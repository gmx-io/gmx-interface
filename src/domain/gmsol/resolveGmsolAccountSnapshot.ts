export function resolveGmsolAccountSnapshot<T>({
  items,
  data,
  previousData,
}: {
  items: { key: string; marketAddress: string }[];
  data: Record<string, T>;
  previousData: Record<string, T> | undefined;
}): { data: Record<string, T>; uncoveredMarketAddresses: string[] } {
  const missing = items.filter((item) => data[item.key] === undefined);

  if (missing.length === 0) {
    return { data, uncoveredMarketAddresses: [] };
  }

  const retained = { ...data };
  for (const { key } of missing) {
    if (previousData?.[key] !== undefined) {
      retained[key] = previousData[key];
    }
  }

  return { data: retained, uncoveredMarketAddresses: [...new Set(missing.map((item) => item.marketAddress))] };
}
