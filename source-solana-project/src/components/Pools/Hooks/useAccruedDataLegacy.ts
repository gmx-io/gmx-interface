import useSWR from 'swr';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import {
    GLV_COMMODITY_TOKEN,
    GLV_FOREX_TOKEN,
    GLV_STOCK_TOKEN,
} from '@/utils/glv/glvTokens';

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
    timeStamp: number; // Unix timestamp
    ydata: number;
    ydataBn: BN,
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

// glvToken => glvAccount
export const GLV_TOKEN_TO_ACCOUNT: Record<string, string> = {
    "7r3XADNMW12k8QiLPaFjW1giYMJNZzUjmDA5HiK7hAPu": "fh3nAdi3P4tYKssVX9AAh9ZmMnek497qz6hPKKL1DPQ",
    "7uwzUKKbXHNmpC5x67apE7JgAmPoWWQpCf7jJZRTqjMk": "FFht5uQqaopvmCYCyxoDaScGNoQGwZjPw7Qu3w8GCnaT",
    [GLV_STOCK_TOKEN]: "DWkWTYb8otwdhkRG6enJXyizia95nRp2v23MhaTFmRnS",
    "HhVNkJ9EWi64j645aVfnNBqXguXvhvKHk7wRnS4wAYmz": "9qKxKw8jnTmAY3kTHHipwyfp3B4kZGLjPhTghbcz6Wvs",
    [GLV_COMMODITY_TOKEN]: "3KyZda3udrMpULGgk7pVqJbLALYPFD3gJDUgNSeYZdPm",
    [GLV_FOREX_TOKEN]: "EtLsc9Aa7JQTSme3TLSTZrDkvSR48ez4gZDr6B7YpbTg",
};

// glvAccount => glvToken
const GLV_ACCOUNT_TO_TOKEN: Record<string, string> = Object.fromEntries(
    Object.entries(GLV_TOKEN_TO_ACCOUNT).map(([token, account]) => [account, token])
);

export interface GlvDailyFeesData {
    lineCharts: LineChartEntry[];
    annualized: string;
}

const MARKET_DAILY_STATS_KEY = 'data_store/market_daily_stats_v3';

interface UseMarketDailyStatsResult {
    marketChartDataMap: Map<string, MarketChartData>;
    glvDailyFeesMap: Map<string, GlvDailyFeesData>;
}

export function useMarketDailyStatsLegacy(
    startTimestamp: string,
    options?: { enabled?: boolean }
) {
    const enabled = options?.enabled !== false;

    // Always fetch ALL data regardless of startTimestamp.
    // Frontend filters by startTimestamp after full cumulative accumulation,
    // so the absolute value on any given day remains consistent across time range switches.
    const { data, isLoading } = useSWR<UseMarketDailyStatsResult>(
        enabled ? [MARKET_DAILY_STATS_KEY] : null,
        async () => {
            const now = new Date();
            // Use UTC midnight to match backend timestamps (which are stored in UTC)
            const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
            const todayTimestamp = utcMidnight.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
            const gmHourlyStatsArgs = `where: { timestamp_gte: "${todayTimestamp}" }, orderBy: timestamp_ASC`;
            const glvHourlyStatsArgs = `where: { timestamp_gte: "${todayTimestamp}" }, orderBy: timestamp_ASC`;
            const requestBody = {
                query: `
                    query MyQuery {
                        gmFeesRecordDailies(orderBy: timestamp_ASC) {
                            dailyFees
                            marketToken
                            id
                            timestamp
                            updateTime
                        }
                        gmFeesRecordHourlies(${gmHourlyStatsArgs}) {
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
                        glvFeesRecordHourlies(${glvHourlyStatsArgs}) {
                            fees
                            glvAccount
                            id
                            timestamp
                            updateTime
                        }
                    }
                `,
            };

            try {
                const response = await fetch(GRAPHQL_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('GraphQL response not ok:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorText,
                    });
                    throw new Error(`GraphQL response not ok: ${response.statusText}`);
                }

                const json = await response.json();
                if (json.errors) {
                    console.error('GraphQL errors:', json.errors);
                    throw new Error(`GraphQL errors: ${json.errors.map((e: any) => e.message).join(', ')}`);
                }

                const marketChartDataMap = new Map<string, MarketChartData>();
                const powerOf20Bn = new BN(10).pow(new BN(20));

                const bnToYdata = (bn: BN): number => {
                    const intPart = bn.div(powerOf20Bn).toString();
                    const remPart = bn.mod(powerOf20Bn).toString().padStart(20, '0');
                    return parseFloat(`${intPart}.${remPart}`);
                };

                // Build marketToken-keyed dailyFees map from gmFeesRecordDailies + gmFeesRecordHourlies
                if (json.data.gmFeesRecordDailies) {
                    // First pass: collect raw daily incremental entries per marketToken
                    const marketRawEntries = new Map<string, { timeStamp: number; dailyFeesBn: BN }[]>();
                    json.data.gmFeesRecordDailies.forEach((entry: GmFeesRecordDailyEntry) => {
                        if (!marketRawEntries.has(entry.marketToken)) {
                            marketRawEntries.set(entry.marketToken, []);
                        }
                        marketRawEntries.get(entry.marketToken)!.push({
                            timeStamp: new Date(entry.timestamp).getTime() / 1000,
                            dailyFeesBn: new BN(entry.dailyFees),
                        });
                    });

                    // Second pass: sort and accumulate daily incremental entries into cumulative lineCharts
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

                // Third pass: sum today's hourly fees per marketToken, append as final cumulative point
                if (json.data.gmFeesRecordHourlies) {
                    const marketTodayHourlySum = new Map<string, BN>();
                    json.data.gmFeesRecordHourlies.forEach((entry: GmFeesRecordHourlyEntry) => {
                        const prev = marketTodayHourlySum.get(entry.marketToken) || new BN(0);
                        marketTodayHourlySum.set(entry.marketToken, prev.add(new BN(entry.fees)));
                    });

                    const nowTimestamp = Date.now() / 1000;
                    marketTodayHourlySum.forEach((todayFeesBn, marketToken) => {
                        if (!marketChartDataMap.has(marketToken)) {
                            marketChartDataMap.set(marketToken, { lineCharts: [], annualized: '0' });
                        }
                        const marketData = marketChartDataMap.get(marketToken)!;
                        const lastCumulativeBn = marketData.lineCharts.length > 0
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

                // Final pass: calculate annualized for each marketToken
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

                // Build glvToken-keyed dailyFees map from glvFeesRecordDailies + glvFeesRecordHourlies
                const glvDailyFeesMap = new Map<string, GlvDailyFeesData>();
                if (json.data.glvFeesRecordDailies) {
                    // First pass: collect raw daily incremental entries per glvToken
                    const glvRawEntries = new Map<string, { timeStamp: number; dailyFeesBn: BN }[]>();
                    json.data.glvFeesRecordDailies.forEach((entry: GlvFeesRecordDailyEntry) => {
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

                    // Second pass: sort and accumulate daily incremental entries into cumulative lineCharts
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

                // Third pass: sum today's hourly fees per glvToken, append as final cumulative point
                if (json.data.glvFeesRecordHourlies) {
                    // Aggregate all hourly fees for today per glvToken
                    const glvTodayHourlySum = new Map<string, BN>();
                    json.data.glvFeesRecordHourlies.forEach((entry: GlvFeesRecordHourlyEntry) => {
                        const glvToken = GLV_ACCOUNT_TO_TOKEN[entry.glvAccount];
                        if (!glvToken) return;
                        const prev = glvTodayHourlySum.get(glvToken) || new BN(0);
                        glvTodayHourlySum.set(glvToken, prev.add(new BN(entry.fees)));
                    });

                    // Append today's cumulative hourly total as the last lineChart point
                    const nowTimestamp = Date.now() / 1000;
                    glvTodayHourlySum.forEach((todayFeesBn, glvToken) => {
                        if (!glvDailyFeesMap.has(glvToken)) {
                            glvDailyFeesMap.set(glvToken, { lineCharts: [], annualized: '0' });
                        }
                        const glvData = glvDailyFeesMap.get(glvToken)!;
                        // The last daily point's cumulative value + today's hourly sum
                        const lastCumulativeBn = glvData.lineCharts.length > 0
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

                // Final pass: calculate annualized for each glvToken
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

            } catch (error) {
                console.error('Error fetching market daily stats:', error);
                throw error;
            }
        },
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    const defaultMarketChartDataMap: Map<string, MarketChartData> = new Map();
    const defaultGlvDailyFeesMap: Map<string, GlvDailyFeesData> = new Map();

    if (!data) {
        return {
            marketChartDataMap: defaultMarketChartDataMap,
            glvDailyFeesMap: defaultGlvDailyFeesMap,
            isAccruedLoading: isLoading,
        };
    }

    // Filter lineCharts by startTimestamp on the client side (data is always full history)
    const filterStartTs = startTimestamp && startTimestamp !== 'total'
        ? new Date(startTimestamp).getTime() / 1000
        : null;

    const filterLineCharts = (lineCharts: LineChartEntry[]) =>
        filterStartTs ? lineCharts.filter(p => p.timeStamp >= filterStartTs) : lineCharts;

    const filteredMarketChartDataMap = new Map<string, MarketChartData>();
    data.marketChartDataMap.forEach((v, k) => {
        const filtered = filterLineCharts(v.lineCharts);
        const annualized = filtered.length > 1
            ? filtered[filtered.length - 1].ydataBn.sub(filtered[0].ydataBn).toString()
            : filtered.length === 1 ? filtered[0].ydataBn.toString() : '0';
        filteredMarketChartDataMap.set(k, { lineCharts: filtered, annualized });
    });

    const filteredGlvDailyFeesMap = new Map<string, GlvDailyFeesData>();
    data.glvDailyFeesMap.forEach((v, k) => {
        const filtered = filterLineCharts(v.lineCharts);
        const annualized = filtered.length > 1
            ? filtered[filtered.length - 1].ydataBn.sub(filtered[0].ydataBn).toString()
            : filtered.length === 1 ? filtered[0].ydataBn.toString() : '0';
        filteredGlvDailyFeesMap.set(k, { lineCharts: filtered, annualized });
    });

    return {
        marketChartDataMap: filteredMarketChartDataMap,
        glvDailyFeesMap: filteredGlvDailyFeesMap,
        isAccruedLoading: false,
    };
}
