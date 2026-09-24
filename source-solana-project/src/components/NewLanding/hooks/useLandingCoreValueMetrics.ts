import {
  buildAverages,
  type AprDailyRecord,
} from '@/components/Pools/utils/aprAverages';
import {
  readLandingCoreValueCache,
  readStaleLandingCoreValueCache,
  writeLandingCoreValueCache,
} from '@/components/NewLanding/utils/landingCoreValueCache';
import { USD_DECIMALS } from '@/config/constants';
import {
  LANDING_CORE_VALUE_APR_KEY,
  LANDING_TOTAL_FEES_LABEL_KEY,
} from '@/config/localStorage';
import {
  GMX_SOLANA_GLV_TOKENS,
  GMX_SOLANA_MARKET_TOKENS,
} from '@/config/program';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useTotalStats } from '@/hooks/statsHooks';
import { formatPercentageReg } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';

const LANDING_APR_SWR_KEY = 'landing/core-value/30d-apr-fetch';
const DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * DAY_MS;
const MILLION = 1_000_000;

const FALLBACK_GLV_APR = '18.4%';
const FALLBACK_GM_APR = '21.7%';

/** App-configured pool addresses (Landing does not mount GlvDataProvider / useMarketsData). */
const CONFIGURED_MARKET_TOKENS = GMX_SOLANA_MARKET_TOKENS.map((pk) =>
  pk.toBase58()
);
const CONFIGURED_GLV_TOKENS = GMX_SOLANA_GLV_TOKENS.map((pk) => pk.toBase58());

type AprRecord = AprDailyRecord & {
  marketToken?: string;
  glvToken?: string;
};

type LandingAprResponse = {
  data?: {
    marketGmInfoDailies?: AprRecord[];
    glvInfoDailies?: AprRecord[];
  };
  errors?: { message: string }[];
};

function toSubqueryDateTimeIso(d: Date): string {
  return d.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
}

function getStartTimestamp30d(): string {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return toSubqueryDateTimeIso(start);
}

function bnToUsdNumber(value: BN): number {
  const factor = new BN(10).pow(new BN(2));
  const adjustedValue = value.mul(factor).div(new BN(10).pow(new BN(USD_DECIMALS)));
  return parseFloat(adjustedValue.toString()) / 100;
}

export function floorToMillionUsdLabel(usdNumber: number): string {
  const floored = Math.floor(usdNumber / MILLION) * MILLION;
  return `$${floored.toLocaleString('en-US')}`;
}

function average30dAprAcrossTokens(
  rows: AprRecord[],
  tokenField: 'marketToken' | 'glvToken',
  tokenAddresses: string[]
): number | null {
  if (!tokenAddresses.length || !rows.length) return null;

  const tokenSet = new Set(tokenAddresses);
  const rowsByToken = new Map<string, AprDailyRecord[]>();

  rows.forEach((row) => {
    const token = row[tokenField];
    if (!token || !tokenSet.has(token)) return;
    const list = rowsByToken.get(token) || [];
    list.push(row);
    rowsByToken.set(token, list);
  });

  const averages: number[] = [];
  tokenAddresses.forEach((token) => {
    const tokenRows = rowsByToken.get(token);
    if (!tokenRows?.length) return;
    const apr30 = buildAverages(tokenRows).get('30');
    if (apr30 !== null && apr30 !== undefined) {
      averages.push(apr30);
    }
  });

  if (!averages.length) return null;
  return averages.reduce((sum, value) => sum + value, 0) / averages.length;
}

function formatAprDisplay(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return formatPercentageReg(value * 10000) ?? null;
}

type LandingAprCacheValue = {
  glvAvg30d: number | null;
  gmAvg30d: number | null;
};

function readValidFeesLabelCache(): string | null {
  return readLandingCoreValueCache<string>(
    LANDING_TOTAL_FEES_LABEL_KEY,
    SEVEN_DAYS_MS
  );
}

function readStaleFeesLabelCache(): string | null {
  return readStaleLandingCoreValueCache<string>(LANDING_TOTAL_FEES_LABEL_KEY);
}

function readValidAprCache(): LandingAprCacheValue | null {
  return readLandingCoreValueCache<LandingAprCacheValue>(
    LANDING_CORE_VALUE_APR_KEY,
    DAY_MS
  );
}

function readStaleAprCache(): LandingAprCacheValue | null {
  return readStaleLandingCoreValueCache<LandingAprCacheValue>(
    LANDING_CORE_VALUE_APR_KEY
  );
}

export function useLandingCoreValueMetrics() {
  const staleFeesLabelRef = useRef(readStaleFeesLabelCache());
  const staleAprRef = useRef(readStaleAprCache());
  const hasValidFeesCache = readValidFeesLabelCache() !== null;
  const hasValidAprCache = readValidAprCache() !== null;

  const { totalStats, isLoading: isTotalStatsLoading } = useTotalStats({
    enabled: !hasValidFeesCache,
  });

  const {
    data: aprData,
    isLoading: isAprLoading,
    error: aprError,
  } = useSWR(
    hasValidAprCache ? null : LANDING_APR_SWR_KEY,
    async () => {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query LandingCoreValueApr($startTimestamp: DateTime!) {
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
          variables: { startTimestamp: getStartTimestamp30d() },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL response not ok: ${response.status}`);
      }

      const json = (await response.json()) as LandingAprResponse;
      if (json.errors?.length) {
        throw new Error(json.errors.map((item) => item.message).join(', '));
      }

      return {
        glvAvg30d: average30dAprAcrossTokens(
          json.data?.glvInfoDailies || [],
          'glvToken',
          CONFIGURED_GLV_TOKENS
        ),
        gmAvg30d: average30dAprAcrossTokens(
          json.data?.marketGmInfoDailies || [],
          'marketToken',
          CONFIGURED_MARKET_TOKENS
        ),
      };
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      refreshInterval: DAY_MS,
      fallbackData: staleAprRef.current ?? undefined,
    }
  );

  const resolvedAprData = aprData ?? staleAprRef.current ?? undefined;

  useEffect(() => {
    if (!aprData) return;
    writeLandingCoreValueCache(LANDING_CORE_VALUE_APR_KEY, aprData);
  }, [aprData]);

  const totalFeesLabel = useMemo(() => {
    if (totalStats.totalFees.isZero()) return '';
    return floorToMillionUsdLabel(bnToUsdNumber(totalStats.totalFees));
  }, [totalStats.totalFees]);

  useEffect(() => {
    if (isTotalStatsLoading || !totalFeesLabel) return;
    writeLandingCoreValueCache(LANDING_TOTAL_FEES_LABEL_KEY, totalFeesLabel);
  }, [isTotalStatsLoading, totalFeesLabel]);

  const feesLoading = hasValidFeesCache ? false : isTotalStatsLoading;
  const aprLoading = hasValidAprCache ? false : isAprLoading;
  const isLoading =
    (feesLoading && !staleFeesLabelRef.current) ||
    (aprLoading && !staleAprRef.current);

  const glvAvgApr30d = useMemo(() => {
    if (aprLoading && !staleAprRef.current) return '...';
    if (aprError) return FALLBACK_GLV_APR;
    return formatAprDisplay(resolvedAprData?.glvAvg30d) ?? FALLBACK_GLV_APR;
  }, [resolvedAprData?.glvAvg30d, aprError, aprLoading]);

  const gmAvgApr30d = useMemo(() => {
    if (aprLoading && !staleAprRef.current) return '...';
    if (aprError) return FALLBACK_GM_APR;
    return formatAprDisplay(resolvedAprData?.gmAvg30d) ?? FALLBACK_GM_APR;
  }, [resolvedAprData?.gmAvg30d, aprError, aprLoading]);

  const displayTotalFeesLabel =
    !feesLoading && totalFeesLabel
      ? totalFeesLabel
      : staleFeesLabelRef.current ?? '...';

  return {
    isLoading,
    totalFeesLabel: displayTotalFeesLabel,
    glvAvgApr30d,
    gmAvgApr30d,
  };
}
