export function computeShareBps(part: bigint, total: bigint): bigint {
  if (total <= 0n) return 0n;
  return (part * 10000n) / total;
}

export function rankByVolumeDesc<T extends { volume: bigint }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.volume < b.volume ? 1 : a.volume > b.volume ? -1 : 0));
}

export function computeTop3ConcentrationBps(rows: { volume: bigint }[], total: bigint): bigint {
  const top3 = rankByVolumeDesc(rows).slice(0, 3);
  const sum = top3.reduce((acc, r) => acc + r.volume, 0n);
  return computeShareBps(sum, total);
}
