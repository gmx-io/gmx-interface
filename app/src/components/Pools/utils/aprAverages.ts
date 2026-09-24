export type AprRangeKey = '30' | '90' | '180' | 'all';

export type AprDailyRecord = {
  timestamp?: string;
  apr?: string | null;
};

export type DetailAprMap = Map<AprRangeKey, number | null>;

const FIXED_RANGES: Array<Exclude<AprRangeKey, 'all'>> = ['30', '90', '180'];

export function parseApr(apr: string | null | undefined): number | null {
  if (apr === null || apr === undefined || apr === '') return null;
  const num = parseFloat(String(apr));
  return Number.isFinite(num) ? num : null;
}

export function parseTimestampMs(ts: string | undefined): number {
  const ms = new Date(ts || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function buildAverages(rows: AprDailyRecord[]): DetailAprMap {
  const map: DetailAprMap = new Map<AprRangeKey, number | null>();
  map.set('30', null);
  map.set('90', null);
  map.set('180', null);
  map.set('all', null);

  const aprList = rows
    .slice()
    .sort((a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp))
    .map((item) => parseApr(item.apr))
    .filter((item): item is number => item !== null);

  if (!aprList.length) return map;

  FIXED_RANGES.forEach((range) => {
    const days = Number(range);
    const rangeList = aprList.slice(0, days);
    if (!rangeList.length) {
      map.set(range, null);
      return;
    }
    const sum = rangeList.reduce((acc, cur) => acc + cur, 0);
    map.set(range, sum / rangeList.length);
  });

  const allSum = aprList.reduce((acc, cur) => acc + cur, 0);
  map.set('all', allSum / aprList.length);

  return map;
}
