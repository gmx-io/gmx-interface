import { computeShareBps } from "./shares";

// Build pie slices from per-item values: each item whose share of `total` is at
// least `minShareBps` becomes its own slice; everything else (sub-threshold
// items plus the unlisted remainder of `total`) is merged into one "Others"
// slice. Slice `value` is the share as a percentage number (e.g. 40.2).
export function buildPieSlices(
  items: { name: string; value: bigint }[],
  total: bigint,
  minShareBps = 500n
): { name: string; value: number }[] {
  if (total <= 0n) return [];

  const slices: { name: string; value: number }[] = [];
  let keptValue = 0n;
  for (const item of items) {
    const shareBps = computeShareBps(item.value, total);
    if (shareBps >= minShareBps) {
      slices.push({ name: item.name, value: Number(shareBps) / 100 });
      keptValue += item.value;
    }
  }

  const othersValue = total - keptValue;
  if (othersValue > 0n) {
    slices.push({ name: "Others", value: Number(computeShareBps(othersValue, total)) / 100 });
  }

  return slices;
}
