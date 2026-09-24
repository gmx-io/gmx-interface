import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { formatParseUsdToBN } from '@/utils/legacy';
import { GLV_ACCOUNT_TO_TOKEN } from '../utils/glvTokenToAccount';
import type { GlvDailyFeesData } from './useAccruedData';
import type { UserEarningsResult } from './useUserEarnings';
import { getTimes } from '../utils/getTimes';
import {
  getStartTimestampDaysAgo,
  getUtcMidnightTimestamp,
} from '../utils/getUtcMidnightTimestamp';

const FEE_APR_DAYS = 90;
const ANN_PERFORMANCE_DAYS = 180;

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

type AprRecord = {
  timestamp?: string;
  apr?: string | null;
  marketToken?: string;
  glvToken?: string;
};

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

type MarketGmAnnPerformanceHourly = {
  gmPriceApyTotal: string;
  annPerformanceTotal: string;
  timestamp: string;
  marketToken: string;
};

type GlvAnnPerformanceHourly = {
  annPerformanceTotal: string;
  glvPriceApyTotal: string;
  glvToken: string;
  timestamp: string;
};

export type GmMarketApyAnn180Entry = {
  avgAnnPerformanceTotal: BN;
  avgGmPriceApyTotal: BN;
  marketToken: string;
};

export type GlvMarketApyAnn180Entry = {
  avgAnnPerformanceTotal: BN;
  avgGlvPriceApyTotal: BN;
  glvToken: string;
};

export type GmMarketsApyAndAnnBy180Map = Record<
  string,
  GmMarketApyAnn180Entry | GlvMarketApyAnn180Entry
>;

export type PoolsOverviewAprMap = Map<string, { annualized: number | null }>;

export type PoolsOverviewSquidRaw = {
  gmFeesRecordDailies?: GmFeesRecordDailyEntry[];
  gmFeesRecordHourlies?: GmFeesRecordHourlyEntry[];
  glvFeesRecordDailies?: GlvFeesRecordDailyEntry[];
  glvFeesRecordHourlies?: GlvFeesRecordHourlyEntry[];
  marketGmInfoDailies?: AprRecord[];
  glvInfoDailies?: AprRecord[];
  marketGmUserHourlies?: MarketGmUserHourly[];
  glvUserHourlies?: GlvUserHourly[];
  marketGmAnnPerformanceHourlies?: MarketGmAnnPerformanceHourly[];
  glvAnnPerformanceHourlies?: GlvAnnPerformanceHourly[];
};

export type PoolsOverviewSquidParsed = {
  marketChartDataMap: Map<string, MarketChartData>;
  glvDailyFeesMap: Map<string, GlvDailyFeesData>;
  aprMap: PoolsOverviewAprMap;
  aprLastMap: PoolsOverviewAprMap;
  userEarnings: UserEarningsResult;
  gmMarketsApyAndAnnBy180: GmMarketsApyAndAnnBy180Map;
};

const POOLS_OVERVIEW_SQUID_QUERY = `
  query PoolsOverviewSquid(
    $startTimestamp: DateTime!
    $todayTimestamp: DateTime!
    $walletAddress: String!
    $marketTokens: [String!]!
    $glvTokens: [String!]!
    $includeUserEarnings: Boolean!
    $performanceTimestamps: [DateTime!]!
    $marketGmAnnLimit: Int!
    $glvAnnLimit: Int!
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
    marketGmAnnPerformanceHourlies(
      limit: $marketGmAnnLimit
      orderBy: timestamp_DESC
      where: {
        marketToken_in: $marketTokens
        timestamp_in: $performanceTimestamps
      }
    ) {
      gmPriceApyTotal
      annPerformanceTotal
      timestamp
      marketToken
    }
    glvAnnPerformanceHourlies(
      limit: $glvAnnLimit
      orderBy: timestamp_DESC
      where: {
        glvToken_in: $glvTokens
        timestamp_in: $performanceTimestamps
      }
    ) {
      annPerformanceTotal
      glvPriceApyTotal
      glvToken
      timestamp
    }
  }
`;

function parseApr(apr: string | number | null | undefined): number | null {
  if (apr === null || apr === undefined || apr === '') return null;
  const num = typeof apr === 'number' ? apr : parseFloat(String(apr));
  return Number.isFinite(num) ? num : null;
}

function parseTimestampMs(ts: string | undefined): number {
  const value = new Date(ts || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function parseAccruedFees(data: PoolsOverviewSquidRaw): {
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

function buildDailyAggMap(
  rows: AprRecord[] | undefined,
  tokenField: 'marketToken' | 'glvToken'
): Map<string, { sum: number; count: number }> {
  const result = new Map<string, { sum: number; count: number }>();
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
      .slice(0, FEE_APR_DAYS);

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
): Map<string, number> {
  const result = new Map<string, number>();
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

function parseFeeAprMaps(data: PoolsOverviewSquidRaw): {
  aprMap: PoolsOverviewAprMap;
  aprLastMap: PoolsOverviewAprMap;
} {
  const marketDailyAgg = buildDailyAggMap(data.marketGmInfoDailies, 'marketToken');
  const glvDailyAgg = buildDailyAggMap(data.glvInfoDailies, 'glvToken');
  const marketLatestApr = buildLatestAprMap(data.marketGmInfoDailies, 'marketToken');
  const glvLatestApr = buildLatestAprMap(data.glvInfoDailies, 'glvToken');

  const aprMap: PoolsOverviewAprMap = new Map();
  marketDailyAgg.forEach((value, token) => {
    if (value.count <= 0) return;
    const divisor = Math.min(value.count, FEE_APR_DAYS);
    aprMap.set(token, { annualized: value.sum / divisor });
  });
  glvDailyAgg.forEach((value, token) => {
    if (value.count <= 0) return;
    const divisor = Math.min(value.count, FEE_APR_DAYS);
    aprMap.set(token, { annualized: value.sum / divisor });
  });

  const aprLastMap: PoolsOverviewAprMap = new Map();
  marketLatestApr.forEach((apr, token) => {
    aprLastMap.set(token, { annualized: apr });
  });
  glvLatestApr.forEach((apr, token) => {
    aprLastMap.set(token, { annualized: apr });
  });

  return { aprMap, aprLastMap };
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
  data: PoolsOverviewSquidRaw,
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

function parseGmMarketsApyAndAnnBy180(
  data: PoolsOverviewSquidRaw,
  marketAddresses: string[],
  glvAddresses: string[]
): GmMarketsApyAndAnnBy180Map {
  const averages: GmMarketsApyAndAnnBy180Map = {};

  if (data.marketGmAnnPerformanceHourlies?.length) {
    marketAddresses.forEach((marketToken) => {
      const dataList = data.marketGmAnnPerformanceHourlies!.filter(
        (item) => item.marketToken === marketToken
      );
      if (dataList.length) {
        let sumAnn = BN_ZERO;
        let sumGm = BN_ZERO;
        dataList.forEach((item) => {
          sumAnn = sumAnn.add(
            formatParseUsdToBN(item.annPerformanceTotal, 20)
          );
          sumGm = sumGm.add(formatParseUsdToBN(item.gmPriceApyTotal, 20));
        });
        const divisor = new BN(dataList.length);
        averages[marketToken] = {
          avgAnnPerformanceTotal: sumAnn.div(divisor),
          avgGmPriceApyTotal: sumGm.div(divisor),
          marketToken,
        };
      } else {
        averages[marketToken] = {
          avgAnnPerformanceTotal: BN_ZERO,
          avgGmPriceApyTotal: BN_ZERO,
          marketToken,
        };
      }
    });
  }

  if (data.glvAnnPerformanceHourlies?.length) {
    glvAddresses.forEach((glvToken) => {
      const dataList = data.glvAnnPerformanceHourlies!.filter(
        (item) => item.glvToken === glvToken
      );
      if (dataList.length) {
        let sumAnn = BN_ZERO;
        let sumGm = BN_ZERO;
        dataList.forEach((item) => {
          sumAnn = sumAnn.add(
            formatParseUsdToBN(item.annPerformanceTotal, 20)
          );
          sumGm = sumGm.add(formatParseUsdToBN(item.glvPriceApyTotal, 20));
        });
        const divisor = new BN(dataList.length);
        averages[glvToken] = {
          avgAnnPerformanceTotal: sumAnn.div(divisor),
          avgGlvPriceApyTotal: sumGm.div(divisor),
          glvToken,
        };
      } else {
        averages[glvToken] = {
          avgAnnPerformanceTotal: BN_ZERO,
          avgGlvPriceApyTotal: BN_ZERO,
          glvToken,
        };
      }
    });
  }

  return averages;
}

export function parsePoolsOverviewSquidData(
  data: PoolsOverviewSquidRaw,
  marketAddresses: string[],
  glvAddresses: string[]
): PoolsOverviewSquidParsed {
  const { marketChartDataMap, glvDailyFeesMap } = parseAccruedFees(data);
  const { aprMap, aprLastMap } = parseFeeAprMaps(data);
  const userEarnings = parseUserEarnings(data, marketAddresses, glvAddresses);
  const gmMarketsApyAndAnnBy180 = parseGmMarketsApyAndAnnBy180(
    data,
    marketAddresses,
    glvAddresses
  );
  return {
    marketChartDataMap,
    glvDailyFeesMap,
    aprMap,
    aprLastMap,
    userEarnings,
    gmMarketsApyAndAnnBy180,
  };
}

export type FetchPoolsOverviewSquidParams = {
  marketAddresses: string[];
  glvAddresses: string[];
  walletAddress?: string;
};

export async function fetchPoolsOverviewSquidData({
  marketAddresses,
  glvAddresses,
  walletAddress,
}: FetchPoolsOverviewSquidParams): Promise<PoolsOverviewSquidParsed> {
  const includeUserEarnings = Boolean(walletAddress);
  const performanceTimestamps = getTimes();
  const marketCount = marketAddresses.length;
  const glvCount = glvAddresses.length;
  const variables = {
    startTimestamp: getStartTimestampDaysAgo(FEE_APR_DAYS),
    todayTimestamp: getUtcMidnightTimestamp(),
    walletAddress: walletAddress || '',
    marketTokens: marketAddresses,
    glvTokens: glvAddresses,
    includeUserEarnings,
    performanceTimestamps,
    marketGmAnnLimit: marketCount * ANN_PERFORMANCE_DAYS,
    glvAnnLimit: glvCount * ANN_PERFORMANCE_DAYS,
  };

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: POOLS_OVERVIEW_SQUID_QUERY,
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

  return parsePoolsOverviewSquidData(
    json.data as PoolsOverviewSquidRaw,
    marketAddresses,
    glvAddresses
  );
}
