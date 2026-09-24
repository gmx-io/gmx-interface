import { GRAPHQL_ENDPOINT } from '@/config/url';
import useSWR from 'swr';

type AprRecord = {
  timestamp?: string;
  apr?: string | null;
  marketToken?: string;
  glvToken?: string;
};

type GraphqlResponse = {
  data?: {
    marketGmInfoDailies?: AprRecord[];
    glvInfoDailies?: AprRecord[];
  };
  errors?: { message: string }[];
};

const FEE_APR_KEY = 'pools/fee-apr/90d';
const DAYS = 90;
/** annualized: decimal ratio from API, e.g. 0.08 means 8% APR */
type AprMap = Map<string, { annualized: number | null }>;
type FeeAprDataResult = { aprMap: AprMap; aprLastMap: AprMap };
type DailyAggMap = Map<string, { sum: number; count: number }>;
type LatestAprMap = Map<string, number>;

function toSubqueryDateTimeIso(d: Date): string {
  return d.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
}

function getStartTimestamp90d(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - DAYS);
  return toSubqueryDateTimeIso(start);
}

function parseApr(apr: string | number | null | undefined): number | null {
  if (apr === null || apr === undefined || apr === '') return null;
  const num = typeof apr === 'number' ? apr : parseFloat(String(apr));
  return Number.isFinite(num) ? num : null;
}

function parseTimestampMs(ts: string | undefined): number {
  const value = new Date(ts || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function buildDailyAggMap(
  rows: AprRecord[] | undefined,
  tokenField: 'marketToken' | 'glvToken'
): DailyAggMap {
  const result: DailyAggMap = new Map();
  if (!rows?.length) return result;
  const rowsByToken = new Map<string, AprRecord[]>();

  rows.forEach((row) => {
    const token = row[tokenField];
    if (!token) return;
    const list = rowsByToken.get(token) || [];
    list.push(row);
    rowsByToken.set(token, list);
  });

  rowsByToken.forEach((tokenRows, token) => {
    const latestRows = tokenRows
      .slice()
      .sort((a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp))
      .slice(0, DAYS);

    let sum = 0;
    let count = 0;
    latestRows.forEach((row) => {
      const parsed = parseApr(row.apr);
      if (parsed === null) return;
      sum += parsed;
      count += 1;
    });

    if (count > 0) {
      result.set(token, { sum, count });
    }
  });
  return result;
}

function buildLatestAprMap(
  rows: AprRecord[] | undefined,
  tokenField: 'marketToken' | 'glvToken'
): LatestAprMap {
  const result: LatestAprMap = new Map();
  if (!rows?.length) return result;

  const latestByToken = new Map<string, { timestamp: number; apr: number }>();
  rows.forEach((row) => {
    const token = row[tokenField];
    if (!token) return;
    const currentApr = parseApr(row.apr);
    if (currentApr === null) return;
    const ts = parseTimestampMs(row.timestamp);
    const prev = latestByToken.get(token);
    if (!prev || ts > prev.timestamp) {
      latestByToken.set(token, { timestamp: ts, apr: currentApr });
    }
  });

  latestByToken.forEach((value, token) => {
    result.set(token, value.apr);
  });
  return result;
}

function appendRolling90dApr(target: AprMap, dailyAgg: DailyAggMap) {
  dailyAgg.forEach((value, token) => {
    if (value.count <= 0) return;
    const divisor = Math.min(value.count, DAYS);
    target.set(token, { annualized: value.sum / divisor });
  });
}

function appendLatestToMap(target: AprMap, latestApr: LatestAprMap) {
  latestApr.forEach((apr, token) => {
    target.set(token, { annualized: apr });
  });
}

export function useFeeAprDataLegacy(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const { data, isLoading, error } = useSWR<FeeAprDataResult, Error>(
    enabled ? FEE_APR_KEY : null,
    async () => {
      const variables = {
        startTimestamp: getStartTimestamp90d(),
      };
      const requestBody = {
        query: `
          query FeeAprBy90d($startTimestamp: DateTime!) {
            marketGmInfoDailies(
              where: { timestamp_gte: $startTimestamp }
              orderBy: timestamp_DESC
            ) {
              timestamp
              apr
              marketToken
            }
            glvInfoDailies(
              where: { timestamp_gte: $startTimestamp }
              orderBy: timestamp_DESC
            ) {
              timestamp
              apr
              glvToken
            }
          }
        `,
        variables,
      };

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`GraphQL response not ok: ${response.status}`);
      }

      const json = (await response.json()) as GraphqlResponse;
      if (json.errors?.length) {
        throw new Error(json.errors.map((item) => item.message).join(', '));
      }

      const marketDailyAgg = buildDailyAggMap(
        json.data?.marketGmInfoDailies,
        'marketToken'
      );
      const glvDailyAgg = buildDailyAggMap(
        json.data?.glvInfoDailies,
        'glvToken'
      );
      const marketLatestApr = buildLatestAprMap(
        json.data?.marketGmInfoDailies,
        'marketToken'
      );
      const glvLatestApr = buildLatestAprMap(
        json.data?.glvInfoDailies,
        'glvToken'
      );

      const aprMap: AprMap = new Map();
      appendRolling90dApr(aprMap, marketDailyAgg);
      appendRolling90dApr(aprMap, glvDailyAgg);
      const aprLastMap: AprMap = new Map();
      appendLatestToMap(aprLastMap, marketLatestApr);
      appendLatestToMap(aprLastMap, glvLatestApr);

      return { aprMap, aprLastMap };
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    aprMap: data?.aprMap ?? new Map<string, { annualized: number | null }>(),
    aprLastMap: data?.aprLastMap ?? new Map<string, { annualized: number | null }>(),
    isLoading,
    error,
  };
}

