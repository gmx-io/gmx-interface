export function parseProtocolStatsUsd(value: string | null | undefined): bigint | undefined {
  return value === null || value === undefined ? undefined : BigInt(value);
}
