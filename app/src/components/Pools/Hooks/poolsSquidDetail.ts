import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { GLV_ACCOUNT_TO_TOKEN } from '../utils/glvTokenToAccount';
import type { GlvDailyFeesData } from './useAccruedData';
import type { UserEarningsResult } from './useUserEarnings';
import type { AprDailyRecord } from '../utils/aprAverages';
import { getUtcMidnightTimestamp } from '../utils/getUtcMidnightTimestamp';

type PoolType = 'GLV' | 'GM';

interface GmFeesRecordDailyEntry {
  dailyFees: string;
  marketToken: string;
  id: string;
  timestamp: string;
  updateTime: string;
}

interface GmFeesRecordHourlyEntry {
  fees: string;
  marketToken: string;
  id: string;
  timestamp: string;
  updateTime: string;
}

interface LineChartEntry {
  timeStamp: number;
  ydata: number;
  ydataBn: BN;
}

interface MarketChartData {
  lineCharts: LineChartEntry[];
  annualized: string;
}

interface GlvFeesRecordDailyEntry {
  dailyFees: string;
  glvAccount: string;
  id: string;
  timestamp: string;
  updateTime: string;
}

interface GlvFeesRecordHourlyEntry {
  fees: string;
  glvAccount: string;
  id: string;
  timestamp: string;
  updateTime: string;
}

type MarketGmUserHourly = {
  totalFees7d: string;
  totalFees: string;
  marketToken: string;
  owner: string;
  timestamp: string;
};

type GlvUserHourly = {
  totalFees7d: string;
  totalFees: string;
  glvToken: string;
  owner: string;
  timestamp: string;
};

export type FeeAprChartPoint = {
  timeStamp: number;
  ydata: number;
};

export type PoolsDetailSquidRaw = {
  gmFeesRecordDailies?: GmFeesRecordDailyEntry[];
  gmFeesRecordHourlies?: GmFeesRecordHourlyEntry[];
  glvFeesRecordDailies?: GlvFeesRecordDailyEntry[];
  glvFeesRecordHourlies?: GlvFeesRecordHourlyEntry[];
  marketGmInfoDailies?: AprDailyRecord[];
  glvInfoDailies?: AprDailyRecord[];
  marketGmUserHourlies?: MarketGmUserHourly[];
  glvUserHourlies?: GlvUserHourly[];
};

export type PoolsDetailSquidParsed = {
  marketChartDataMap: Map<string, MarketChartData>;
  glvDailyFeesMap: Map<string, GlvDailyFeesData>;
  tokenAprRows: AprDailyRecord[];
  userEarnings: UserEarningsResult;
};

const POOLS_DETAIL_SQUID_QUERY = `
  query PoolsDetailSquid(
    $todayTimestamp: DateTime!
    $walletAddress: String!
    $marketTokens: [String!]!
    $glvTokens: [String!]!
    $includeUserEarnings: Boolean!
    $tokenAddress: String!
    $isGmPool: Boolean!
    $isGlvPool: Boolean!
  ) {
    gmFeesRecordDailies(orderBy: timestamp_ASC) {
      dailyFees
      marketToken
      id
      timestamp
      updateTime
    }
    gmFeesRecordHourlies(
      where: { timestamp_gte: $todayTimestamp }
      orderBy: timestamp_ASC
    ) {
      fees
      marketToken
      id
      timestamp
      updateTime
    }
    glvFeesRecordDailies(orderBy: timestamp_ASC) {
      dailyFees
      glvAccount
      id
      timestamp
      updateTime
    }
    glvFeesRecordHourlies(
      where: { timestamp_gte: $todayTimestamp }
      orderBy: timestamp_ASC
    ) {
      fees
      glvAccount
      id
      timestamp
      updateTime
    }
    marketGmInfoDailies(
      where: { marketToken_eq: $tokenAddress }
      orderBy: timestamp_DESC
    ) @include(if: $isGmPool) {
      timestamp
      apr
    }
    glvInfoDailies(
      where: { glvToken_eq: $tokenAddress }
      orderBy: timestamp_DESC
    ) @include(if: $isGlvPool) {
      timestamp
      apr
    }
    marketGmUserHourlies(
      where: { owner_eq: $walletAddress, marketToken_in: $marketTokens }
      orderBy: timestamp_DESC
    ) @include(if: $includeUserEarnings) {
      totalFees7d
      totalFees
      marketToken
      owner
      timestamp
    }
    glvUserHourlies(
      where: { owner_eq: $walletAddress, glvToken_in: $glvTokens }
      orderBy: timestamp_DESC
    ) @include(if: $includeUserEarnings) {
      totalFees7d
      totalFees
      glvToken
      owner
      timestamp
    }
  }
`;

function parseApr(apr: string | null | undefined): number | null {
  if (apr === null || apr === undefined || apr === '') return null;
  const num = parseFloat(String(apr));
  return Number.isFinite(num) ? num : null;
}

function parseTimestampToSeconds(ts: string | undefined): number | null {
  if (!ts) return null;
  const ms = new Date(ts).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function parseAccruedFees(data: PoolsDetailSquidRaw): {
  marketChartDataMap: Map<string, MarketChartData>;
  glvDailyFeesMap: Map<string, GlvDailyFeesData>;
} {
  const marketChartDataMap = new Map<string, MarketChartData>();
  const powerOf20Bn = new BN(10).pow(new BN(20));

  const bnToYdata = (bn: BN): number => {
    const intPart = bn.div(powerOf20Bn).toString();
    const remPart = bn.mod(powerOf20Bn).toString().padStart(20, '0');
    return parseFloat(`${intPart}.${remPart}`);
  };

  if (data.gmFeesRecordDailies) {
    const marketRawEntries = new Map<string, { timeStamp: number; dailyFeesBn: BN }[]>();
    data.gmFeesRecordDailies.forEach((entry) => {
      if (!marketRawEntries.has(entry.marketToken)) {
        marketRawEntries.set(entry.marketToken, []);
      }
      marketRawEntries.get(entry.marketToken)!.push({
        timeStamp: new Date(entry.timestamp).getTime() / 1000,
        dailyFeesBn: new BN(entry.dailyFees),
      });
    });

    marketRawEntries.forEach((entries, marketToken) => {
      entries.sort((a, b) => a.timeStamp - b.timeStamp);
      let cumulativeBn = new BN(0);
      const lineCharts: LineChartEntry[] = entries.map((e) => {
        cumulativeBn = cumulativeBn.add(e.dailyFeesBn);
        return {
          timeStamp: e.timeStamp,
          ydata: bnToYdata(cumulativeBn),
          ydataBn: cumulativeBn.clone(),
        };
      });
      marketChartDataMap.set(marketToken, { lineCharts, annualized: '0' });
    });
  }

  if (data.gmFeesRecordHourlies) {
    const marketTodayHourlySum = new Map<string, BN>();
    data.gmFeesRecordHourlies.forEach((entry) => {
      const prev = marketTodayHourlySum.get(entry.marketToken) || new BN(0);
      marketTodayHourlySum.set(entry.marketToken, prev.add(new BN(entry.fees)));
    });

    const nowTimestamp = Date.now() / 1000;
    marketTodayHourlySum.forEach((todayFeesBn, marketToken) => {
      if (!marketChartDataMap.has(marketToken)) {
        marketChartDataMap.set(marketToken, { lineCharts: [], annualized: '0' });
      }
      const marketData = marketChartDataMap.get(marketToken)!;
      const lastCumulativeBn =
        marketData.lineCharts.length > 0
          ? marketData.lineCharts[marketData.lineCharts.length - 1].ydataBn
          : new BN(0);
      const todayCumulativeBn = lastCumulativeBn.add(todayFeesBn);
      marketData.lineCharts.push({
        timeStamp: nowTimestamp,
        ydata: bnToYdata(todayCumulativeBn),
        ydataBn: todayCumulativeBn,
      });
    });
  }

  marketChartDataMap.forEach((marketData) => {
    if (marketData.lineCharts.length > 1) {
      marketData.annualized = marketData.lineCharts[marketData.lineCharts.length - 1].ydataBn
        .sub(marketData.lineCharts[0].ydataBn)
        .toString();
    } else if (marketData.lineCharts.length === 1) {
      marketData.annualized = marketData.lineCharts[0].ydataBn.toString();
    } else {
      marketData.annualized = '0';
    }
  });

  const glvDailyFeesMap = new Map<string, GlvDailyFeesData>();
  if (data.glvFeesRecordDailies) {
    const glvRawEntries = new Map<string, { timeStamp: number; dailyFeesBn: BN }[]>();
    data.glvFeesRecordDailies.forEach((entry) => {
      const glvToken = GLV_ACCOUNT_TO_TOKEN[entry.glvAccount];
      if (!glvToken) return;
      if (!glvRawEntries.has(glvToken)) {
        glvRawEntries.set(glvToken, []);
      }
      glvRawEntries.get(glvToken)!.push({
        timeStamp: new Date(entry.timestamp).getTime() / 1000,
        dailyFeesBn: new BN(entry.dailyFees),
      });
    });

    glvRawEntries.forEach((entries, glvToken) => {
      entries.sort((a, b) => a.timeStamp - b.timeStamp);
      let cumulativeBn = new BN(0);
      const lineCharts: LineChartEntry[] = entries.map((e) => {
        cumulativeBn = cumulativeBn.add(e.dailyFeesBn);
        return {
          timeStamp: e.timeStamp,
          ydata: bnToYdata(cumulativeBn),
          ydataBn: cumulativeBn.clone(),
        };
      });
      glvDailyFeesMap.set(glvToken, { lineCharts, annualized: '0' });
    });
  }

  if (data.glvFeesRecordHourlies) {
    const glvTodayHourlySum = new Map<string, BN>();
    data.glvFeesRecordHourlies.forEach((entry) => {
      const glvToken = GLV_ACCOUNT_TO_TOKEN[entry.glvAccount];
      if (!glvToken) return;
      const prev = glvTodayHourlySum.get(glvToken) || new BN(0);
      glvTodayHourlySum.set(glvToken, prev.add(new BN(entry.fees)));
    });

    const nowTimestamp = Date.now() / 1000;
    glvTodayHourlySum.forEach((todayFeesBn, glvToken) => {
      if (!glvDailyFeesMap.has(glvToken)) {
        glvDailyFeesMap.set(glvToken, { lineCharts: [], annualized: '0' });
      }
      const glvData = glvDailyFeesMap.get(glvToken)!;
      const lastCumulativeBn =
        glvData.lineCharts.length > 0
          ? glvData.lineCharts[glvData.lineCharts.length - 1].ydataBn
          : new BN(0);
      const todayCumulativeBn = lastCumulativeBn.add(todayFeesBn);
      glvData.lineCharts.push({
        timeStamp: nowTimestamp,
        ydata: bnToYdata(todayCumulativeBn),
        ydataBn: todayCumulativeBn,
      });
    });
  }

  glvDailyFeesMap.forEach((glvData) => {
    if (glvData.lineCharts.length > 1) {
      glvData.annualized = glvData.lineCharts[glvData.lineCharts.length - 1].ydataBn
        .sub(glvData.lineCharts[0].ydataBn)
        .toString();
    } else if (glvData.lineCharts.length === 1) {
      glvData.annualized = glvData.lineCharts[0].ydataBn.toString();
    } else {
      glvData.annualized = '0';
    }
  });

  return { marketChartDataMap, glvDailyFeesMap };
}

function emptyUserEarnings(
  marketAddresses: string[],
  glvAddresses: string[]
): UserEarningsResult {
  const result: UserEarningsResult = {
    byMarketAddress: {},
    byGlvAddress: {},
    allMarkets: {
      totalAmount: BN_ZERO,
      total: BN_ZERO,
      recent7d: BN_ZERO,
      recent7dAmount: BN_ZERO,
      expected365d: BN_ZERO,
    },
    allGlvs: {
      total: BN_ZERO,
      recent7d: BN_ZERO,
      expected365d: BN_ZERO,
    },
  };

  marketAddresses.forEach((marketAddress) => {
    result.byMarketAddress[marketAddress] = {
      total: BN_ZERO,
      recent7d: BN_ZERO,
      expected365d: BN_ZERO,
    };
  });

  glvAddresses.forEach((glvAddress) => {
    result.byGlvAddress[glvAddress] = {
      total: BN_ZERO,
      recent7d: BN_ZERO,
      expected365d: BN_ZERO,
    };
  });

  return result;
}

function parseUserEarnings(
  data: PoolsDetailSquidRaw,
  marketAddresses: string[],
  glvAddresses: string[]
): UserEarningsResult {
  const marketRows = data.marketGmUserHourlies;
  const glvRows = data.glvUserHourlies;

  if (!marketRows) {
    return emptyUserEarnings(marketAddresses, glvAddresses);
  }

  const latestDataByMarket: Record<string, MarketGmUserHourly> = {};
  marketRows.forEach((entry) => {
    if (!latestDataByMarket[entry.marketToken]) {
      latestDataByMarket[entry.marketToken] = entry;
    }
  });

  const latestDataByGlv: Record<string, GlvUserHourly> = {};
  glvRows?.forEach((entry) => {
    if (!latestDataByGlv[entry.glvToken]) {
      latestDataByGlv[entry.glvToken] = entry;
    }
  });

  const userEarnings = emptyUserEarnings(marketAddresses, glvAddresses);

  Object.entries(latestDataByMarket).forEach(([marketAddress, row]) => {
    const total = new BN(row.totalFees);
    const recent7d = new BN(row.totalFees7d);
    let expected365d = recent7d.muln(365).divn(7);

    const marketEntries = marketRows.filter(
      (entry) => entry.marketToken === marketAddress
    );

    if (marketEntries.length > 1) {
      marketEntries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const oldestTimestamp = new Date(marketEntries[0].timestamp).getTime();
      const newestTimestamp = new Date(
        marketEntries[marketEntries.length - 1].timestamp
      ).getTime();
      const hoursDiff = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60);
      if (hoursDiff > 0) {
        expected365d = recent7d.mul(new BN(24 * 365)).div(new BN(hoursDiff));
      }
    }

    userEarnings.byMarketAddress[marketAddress] = { total, recent7d, expected365d };
    userEarnings.allMarkets.total = userEarnings.allMarkets.total.add(total);
    userEarnings.allMarkets.recent7d = userEarnings.allMarkets.recent7d.add(recent7d);
    userEarnings.allMarkets.expected365d =
      userEarnings.allMarkets.expected365d.add(expected365d);
  });

  Object.entries(latestDataByGlv).forEach(([glvAddress, row]) => {
    const total = new BN(row.totalFees);
    const recent7d = new BN(row.totalFees7d);
    let expected365d = recent7d.muln(365).divn(7);

    const glvEntries = (glvRows || []).filter(
      (entry) => entry.glvToken === glvAddress
    );

    if (glvEntries.length > 1) {
      glvEntries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const oldestTimestamp = new Date(glvEntries[0].timestamp).getTime();
      const newestTimestamp = new Date(
        glvEntries[glvEntries.length - 1].timestamp
      ).getTime();
      const hoursDiff = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60);
      if (hoursDiff > 0) {
        expected365d = recent7d.mul(new BN(24 * 365)).div(new BN(hoursDiff));
      }
    }

    userEarnings.byGlvAddress[glvAddress] = { total, recent7d, expected365d };
    userEarnings.allGlvs.total = userEarnings.allGlvs.total.add(total);
    userEarnings.allGlvs.recent7d = userEarnings.allGlvs.recent7d.add(recent7d);
    userEarnings.allGlvs.expected365d =
      userEarnings.allGlvs.expected365d.add(expected365d);
  });

  return userEarnings;
}

export function parseFeeAprChartPoints(
  rows: AprDailyRecord[],
  startTimestamp?: string
): FeeAprChartPoint[] {
  const isTotalRange = !startTimestamp || startTimestamp === 'total';
  const filterStartMs =
    !isTotalRange && startTimestamp
      ? new Date(startTimestamp).getTime()
      : null;

  return rows
    .map((row) => {
      const timeStamp = parseTimestampToSeconds(row.timestamp);
      const ydata = parseApr(row.apr);
      if (timeStamp === null || ydata === null) return null;
      if (filterStartMs !== null) {
        const rowMs = timeStamp * 1000;
        if (rowMs < filterStartMs) return null;
      }
      return { timeStamp, ydata };
    })
    .filter((item): item is FeeAprChartPoint => Boolean(item))
    .sort((a, b) => a.timeStamp - b.timeStamp);
}

export function parsePoolsDetailSquidData(
  data: PoolsDetailSquidRaw,
  poolType: PoolType,
  marketAddresses: string[],
  glvAddresses: string[]
): PoolsDetailSquidParsed {
  const { marketChartDataMap, glvDailyFeesMap } = parseAccruedFees(data);
  const tokenAprRows =
    poolType === 'GM'
      ? data.marketGmInfoDailies || []
      : data.glvInfoDailies || [];
  const userEarnings = parseUserEarnings(data, marketAddresses, glvAddresses);
  return { marketChartDataMap, glvDailyFeesMap, tokenAprRows, userEarnings };
}

export type FetchPoolsDetailSquidParams = {
  marketAddresses: string[];
  glvAddresses: string[];
  walletAddress?: string;
  poolType: PoolType;
  tokenAddress: string;
};

export async function fetchPoolsDetailSquidData({
  marketAddresses,
  glvAddresses,
  walletAddress,
  poolType,
  tokenAddress,
}: FetchPoolsDetailSquidParams): Promise<PoolsDetailSquidParsed> {
  const includeUserEarnings = Boolean(walletAddress);
  const variables = {
    todayTimestamp: getUtcMidnightTimestamp(),
    walletAddress: walletAddress || '',
    marketTokens: marketAddresses,
    glvTokens: glvAddresses,
    includeUserEarnings,
    tokenAddress,
    isGmPool: poolType === 'GM',
    isGlvPool: poolType === 'GLV',
  };

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: POOLS_DETAIL_SQUID_QUERY,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL response not ok: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join(', '));
  }

  return parsePoolsDetailSquidData(
    json.data as PoolsDetailSquidRaw,
    poolType,
    marketAddresses,
    glvAddresses
  );
}
