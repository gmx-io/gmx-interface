import type { Freshness } from "lib/useSWRWithFreshness";

export type ChainsStatsValue = bigint | number | string | undefined;

export type ChainsStatsEntries = { [title: string]: ChainsStatsValue };

export type ChainsStatsSummary = {
  knownEntries: [string, ChainsStatsValue][];
  missingTitles: string[];
  total: bigint | undefined;
};

function isKnown(value: ChainsStatsValue) {
  return value !== undefined && value !== null;
}

function amountOf(value: ChainsStatsValue): bigint {
  return BigInt(value || 0);
}

// a network that has not answered is named below the total rather than summed as zero
export function summarizeChainsStats(entries: ChainsStatsEntries): ChainsStatsSummary {
  const allEntries = Object.entries(entries);

  const knownEntries = allEntries
    .filter(([, value]) => isKnown(value))
    .sort(([, left], [, right]) => {
      const a = amountOf(left);
      const b = amountOf(right);

      return a === b ? 0 : a > b ? -1 : 1;
    });
  const missingTitles = allEntries.filter(([, value]) => !isKnown(value)).map(([title]) => title);
  const total =
    knownEntries.length === 0 ? undefined : knownEntries.reduce((acc, [, value]) => acc + amountOf(value), 0n);

  return { knownEntries, missingTitles, total };
}

export type ChainsStatsStaleEntry = { title: string; asOf: number | undefined };

type ChainsStatsStaleSource = [freshness: Freshness | undefined, ...titles: string[]];

// a source that could not be refreshed keeps its last value on screen, so every network it covers is listed with that age
export function getStaleEntries(...sources: ChainsStatsStaleSource[]): ChainsStatsStaleEntry[] {
  const entries: ChainsStatsStaleEntry[] = [];

  for (const [freshness, ...titles] of sources) {
    if (freshness?.isStale) {
      entries.push(...titles.map((title) => ({ title, asOf: freshness.asOf })));
    }
  }

  return entries;
}
