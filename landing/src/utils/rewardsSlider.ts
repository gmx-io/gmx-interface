export function getRewardsSliderStops(tiers: { threshold: bigint }[]) {
  return [0n, ...Array.from(new Set(tiers.map(({ threshold }) => threshold)))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );
}

export function getRewardsSliderAmount(stops: bigint[], position: number) {
  const index = Math.min(Math.floor(position / 100), stops.length - 1);
  const start = stops[index];
  const end = stops[index + 1] ?? start;
  return start + ((end - start) * BigInt(Math.round(position % 100))) / 100n;
}

export function getRewardsSliderPosition(stops: bigint[], amount: bigint) {
  const index = stops.findIndex((stop) => stop > amount);
  if (index < 0) return (stops.length - 1) * 100;
  if (index === 0) return 0;
  return (index - 1) * 100 + Number(((amount - stops[index - 1]) * 100n) / (stops[index] - stops[index - 1]));
}
