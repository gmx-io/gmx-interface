import { gql } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { format } from "date-fns";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { decodeAbiParameters } from "viem";

import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { OrderType, getOrderTypeLabel } from "domain/synthetics/orders";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { TradeActionType } from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";
import { formatDateTime, normalizeDateRange } from "lib/dates";
import { tryDecodeCustomError } from "lib/errors";
import { getSubsquidGraphClient } from "lib/indexers";
import { formatAmount, numberWithCommas } from "lib/numbers";
import { GraphQlFilters, buildFiltersBody } from "sdk/utils/indexers";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import Checkbox from "components/Checkbox/Checkbox";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import type { Item } from "components/TableOptionsFilter/types";
import { getErrorTooltipTitle } from "components/TradeHistory/TradeHistoryRow/utils/shared";

import "./OrderExecutionStats.scss";

const CHART_MARGIN = { top: 16, right: 12, bottom: 16, left: 4 };
const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };
const RATE_Y_AXIS_DOMAIN: [number, number] = [0, 100];
const ORDER_BAR_RADIUS: [number, number, number, number] = [2, 2, 0, 0];

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};

const Y_AXIS_RIGHT_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  ...CHART_TICK_PROPS,
  textAnchor: "start",
};

const X_AXIS_LINE_PROPS: React.SVGProps<SVGLineElement> = {
  stroke: "var(--color-slate-600)",
  strokeWidth: 0.5,
};

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-green-500)",
  fill: "var(--color-slate-900)",
};

const SUCCESS_RATE_DOT_PROPS = {
  r: 2,
  strokeWidth: 1,
  stroke: "var(--color-green-500)",
  fill: "var(--color-slate-900)",
};

const UNSUCCESSFUL_ORDER_EVENTS = [TradeActionType.OrderCancelled, TradeActionType.OrderFrozen];

const MAX_BUCKETS = 180;
const CHART_BUCKETS_QUERY_BATCH_SIZE = 40;
const FAILURE_REASONS_PAGE_SIZE = 1000;
const MAX_FAILURE_REASON_EVENTS = 10000;
const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
const SECONDS_IN_WEEK = 7 * SECONDS_IN_DAY;
const SECONDS_IN_MONTH = 30 * SECONDS_IN_DAY;
const ORDER_STATS_MIN_TIMESTAMP = Math.floor(new Date(2021, 8, 6).getTime() / 1000);

type BucketSizeKey = "auto" | "1h" | "6h" | "1d" | "1w" | "1mo";

const BUCKET_SIZE_SECONDS: Record<Exclude<BucketSizeKey, "auto">, number> = {
  "1h": SECONDS_IN_HOUR,
  "6h": 6 * SECONDS_IN_HOUR,
  "1d": SECONDS_IN_DAY,
  "1w": SECONDS_IN_WEEK,
  "1mo": SECONDS_IN_MONTH,
};

const BUCKET_SIZE_KEYS: BucketSizeKey[] = ["auto", "1h", "6h", "1d", "1w", "1mo"];

const ORDER_TYPES = [
  OrderType.MarketSwap,
  OrderType.LimitSwap,
  OrderType.MarketIncrease,
  OrderType.LimitIncrease,
  OrderType.StopIncrease,
  OrderType.MarketDecrease,
  OrderType.LimitDecrease,
  OrderType.StopLossDecrease,
];

const MARKET_ORDER_TYPES = [OrderType.MarketSwap, OrderType.MarketIncrease, OrderType.MarketDecrease];

const STANDARD_ERROR_SELECTOR = "0x08c379a0";
const PANIC_ERROR_SELECTOR = "0x4e487b71";

const PANIC_REASON_BY_CODE: Record<string, string> = {
  "0x00": "generic compiler panic",
  "0x01": "assertion failed",
  "0x11": "arithmetic overflow or underflow",
  "0x12": "division or modulo by zero",
  "0x21": "invalid enum conversion",
  "0x22": "incorrectly encoded storage byte array",
  "0x31": "pop on an empty array",
  "0x32": "array index out of bounds",
  "0x41": "too much memory allocated",
  "0x51": "zero-initialized internal function",
};

type OrderExecutionStatsPoint = {
  fromTimestamp: number;
  toTimestamp: number;
  dateCompact: string;
  dateTooltip: string;
  executedCount: number;
  unsuccessfulCount: number;
  totalCount: number;
  successRate: number | null;
};

type OrderExecutionStatsSummary = {
  executedCount: number;
  unsuccessfulCount: number;
  totalCount: number;
  successRate: number | null;
};

type OrderExecutionStatsResponse = {
  chartData: OrderExecutionStatsPoint[];
  summary: OrderExecutionStatsSummary;
};

type OrderFailureReasonRow = {
  key: string;
  reason: string;
  reasonDetails: string | undefined;
  exclusionFilter: GraphQlFilters;
  count: number;
  percentage: number | null;
};

type OrderFailureReasonsResponse = {
  rows: OrderFailureReasonRow[];
  totalCount: number;
  fetchedCount: number;
  isTruncated: boolean;
};

type Bucket = {
  fromTimestamp: number;
  toTimestamp: number;
};

type TimeRange = {
  fromTimestamp: number;
  toTimestamp: number;
};

type OrderExecutionStatsQueryParams = {
  chainId: number;
  buckets: Bucket[];
  orderTypes: OrderType[];
  marketAddresses: string[];
  disabledFailureReasons: OrderFailureReasonRow[];
};

export function OrderExecutionStats() {
  const { chainId, srcChainId } = useChainId();
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>(() => [
    new Date(Date.now() - 7 * SECONDS_IN_DAY * 1000),
    new Date(),
  ]);
  const [bucketSize, setBucketSize] = useState<BucketSizeKey>("auto");
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [marketAddresses, setMarketAddresses] = useState<string[]>([]);
  const [disabledFailureReasonKeys, setDisabledFailureReasonKeys] = useState<string[]>([]);
  const [startDate, endDate] = dateRange;

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const marketOptions: Item<string>[] = useMemo(() => {
    return Object.values(marketsInfoData || {})
      .filter((market) => !market.isDisabled)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((market) => ({
        data: market.marketTokenAddress,
        text: market.name,
      }));
  }, [marketsInfoData]);

  const orderTypeOptions: Item<OrderType>[] = useMemo(
    () =>
      ORDER_TYPES.map((orderType) => ({
        data: orderType,
        text: getOrderTypeLabel(orderType) ?? t`Stop Increase`,
      })),
    []
  );

  const range = useMemo(() => getSelectedRange(startDate, endDate), [endDate, startDate]);
  const rangeSeconds = range.toTimestamp - range.fromTimestamp;

  useEffect(() => {
    if (!isBucketSizeValid(bucketSize, rangeSeconds)) {
      setBucketSize("auto");
    }
  }, [bucketSize, rangeSeconds]);

  const buckets = useMemo(
    () => buildBuckets(range.fromTimestamp, range.toTimestamp, bucketSize),
    [bucketSize, range.fromTimestamp, range.toTimestamp]
  );

  const bucketSizeOptions = useMemo(
    () =>
      BUCKET_SIZE_KEYS.map((key) => ({
        key,
        label: getBucketSizeLabel(key),
        disabled: !isBucketSizeValid(key, rangeSeconds),
      })),
    [rangeSeconds]
  );

  const {
    data: failureReasonsData,
    error: failureReasonsError,
    isLoading: isFailureReasonsLoading,
  } = useOrderFailureReasons({
    chainId,
    range,
    orderTypes,
    marketAddresses,
  });

  const disabledFailureReasonKeySet = useMemo(() => new Set(disabledFailureReasonKeys), [disabledFailureReasonKeys]);

  const disabledFailureReasons = useMemo(
    () => failureReasonsData?.rows.filter((row) => disabledFailureReasonKeySet.has(row.key)) || [],
    [disabledFailureReasonKeySet, failureReasonsData?.rows]
  );

  const { data, error } = useOrderExecutionStats({
    chainId,
    buckets,
    orderTypes,
    marketAddresses,
    disabledFailureReasons,
  });

  const isLoading = !data && !error;
  const summary = data?.summary;
  const chartData = data?.chartData || [];
  const hasData = chartData.some((point) => point.totalCount > 0);

  const handleBucketSizeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setBucketSize(event.target.value as BucketSizeKey);
  }, []);

  const handleOrderTypesChange = useCallback((value: OrderType[]) => setOrderTypes(value), []);
  const handleMarketAddressesChange = useCallback((value: string[]) => setMarketAddresses(value), []);
  const handleFailureReasonEnabledChange = useCallback((key: string, isEnabled: boolean) => {
    setDisabledFailureReasonKeys((prevKeys) => {
      if (isEnabled) {
        return prevKeys.filter((prevKey) => prevKey !== key);
      }

      if (prevKeys.includes(key)) {
        return prevKeys;
      }

      return [...prevKeys, key];
    });
  }, []);
  const handleFailureReasonsEnabledChange = useCallback((keys: string[], isEnabled: boolean) => {
    setDisabledFailureReasonKeys((prevKeys) => {
      const keySet = new Set(keys);

      if (isEnabled) {
        return prevKeys.filter((prevKey) => !keySet.has(prevKey));
      }

      const nextKeySet = new Set(prevKeys);
      keys.forEach((key) => nextKeySet.add(key));

      return Array.from(nextKeySet);
    });
  }, []);

  const orderTypeFilterLabel = orderTypes.length ? t`Order type: ${orderTypes.length}` : t`Order type`;
  const marketFilterLabel = marketAddresses.length ? t`Market: ${marketAddresses.length}` : t`Market`;

  return (
    <AppPageLayout title={t`Order execution stats`} header={<ChainContentHeader />}>
      <div className="OrderExecutionStats default-container page-layout">
        <PageTitle
          title={t`Order execution stats`}
          subtitle={t`Execution success rate across terminal order events`}
          qa="order-execution-stats-page"
        />

        <div className="OrderExecutionStats-controls">
          <label className="OrderExecutionStats-field">
            <span>
              <Trans>Bucket size</Trans>
            </span>
            <select className="OrderExecutionStats-select" value={bucketSize} onChange={handleBucketSizeChange}>
              {bucketSizeOptions.map((option) => (
                <option key={option.key} value={option.key} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <TableOptionsFilter<OrderType>
            multiple
            asButton
            label={orderTypeFilterLabel}
            options={orderTypeOptions}
            value={orderTypes}
            onChange={handleOrderTypesChange}
            placeholder={t`Search order types`}
          />

          <TableOptionsFilter<string>
            multiple
            asButton
            label={marketFilterLabel}
            options={marketOptions}
            value={marketAddresses}
            onChange={handleMarketAddressesChange}
            placeholder={t`Search markets`}
          />

          <DateRangeSelect
            startDate={startDate}
            endDate={endDate}
            onChange={setDateRange}
            buttonVariant="secondary"
            popupPlacement="bottom-end"
          />
        </div>

        <div className="OrderExecutionStats-summary">
          <SummaryCard label={t`Success rate`} value={formatSuccessRate(summary?.successRate)} primary />
          <SummaryCard label={t`Terminal orders`} value={formatCount(summary?.totalCount)} />
          <SummaryCard label={t`Executed`} value={formatCount(summary?.executedCount)} />
          <SummaryCard label={t`Cancelled / frozen`} value={formatCount(summary?.unsuccessfulCount)} />
        </div>

        <div className="OrderExecutionStats-chart-card">
          <div className="OrderExecutionStats-chart-header">
            <div>
              <div className="OrderExecutionStats-chart-title">
                <Trans>Success rate over time</Trans>
              </div>
              <div className="OrderExecutionStats-chart-subtitle">
                <Trans>Executed orders divided by executed, cancelled, and frozen orders</Trans>
              </div>
            </div>
            <div className="OrderExecutionStats-legend">
              <LegendItem className="bg-green-500" label={t`Success rate`} />
              <LegendItem className="bg-blue-300" label={t`Executed`} />
              <LegendItem className="bg-red-500" label={t`Cancelled / frozen`} />
            </div>
          </div>

          <div className="OrderExecutionStats-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" debounce={500}>
              <ComposedChart data={chartData} margin={CHART_MARGIN} barCategoryGap="25%">
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="5 3"
                  strokeWidth={0.5}
                  stroke="var(--color-slate-600)"
                />
                <XAxis
                  dataKey="dateCompact"
                  tickLine={false}
                  axisLine={X_AXIS_LINE_PROPS}
                  minTickGap={24}
                  tick={CHART_TICK_PROPS}
                  tickMargin={10}
                />
                <YAxis
                  yAxisId="rate"
                  type="number"
                  domain={RATE_Y_AXIS_DOMAIN}
                  tickCount={6}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tickFormatter={formatYAxisPercentage}
                  tick={CHART_TICK_PROPS}
                  width={42}
                />
                <YAxis
                  yAxisId="count"
                  type="number"
                  orientation="right"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={28}
                  tickFormatter={formatCompactCount}
                  tick={Y_AXIS_RIGHT_TICK_PROPS}
                  width={58}
                />
                <RechartsTooltip
                  cursor={CHART_CURSOR_PROPS}
                  content={<OrderExecutionStatsTooltip />}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                />
                <Bar
                  yAxisId="count"
                  stackId="orders"
                  dataKey="executedCount"
                  fill="var(--color-blue-300)"
                  radius={ORDER_BAR_RADIUS}
                />
                <Bar
                  yAxisId="count"
                  stackId="orders"
                  dataKey="unsuccessfulCount"
                  fill="var(--color-red-500)"
                  radius={ORDER_BAR_RADIUS}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="successRate"
                  stroke="var(--color-green-500)"
                  strokeWidth={2}
                  dot={SUCCESS_RATE_DOT_PROPS}
                  activeDot={ACTIVE_DOT_PROPS}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {isLoading && (
              <div className="OrderExecutionStats-chart-overlay">
                <Loader />
              </div>
            )}
            {error && (
              <div className="OrderExecutionStats-chart-overlay text-red-500">
                <Trans>Failed to load order execution stats</Trans>
              </div>
            )}
            {!isLoading && !error && !hasData && (
              <div className="OrderExecutionStats-chart-overlay text-typography-secondary">
                <Trans>No data available</Trans>
              </div>
            )}
          </div>
        </div>

        <FailureReasonsTable
          data={failureReasonsData}
          error={failureReasonsError}
          isLoading={isFailureReasonsLoading}
          disabledReasonKeys={disabledFailureReasonKeySet}
          onReasonEnabledChange={handleFailureReasonEnabledChange}
          onReasonsEnabledChange={handleFailureReasonsEnabledChange}
        />
      </div>
    </AppPageLayout>
  );
}

function useOrderExecutionStats(params: OrderExecutionStatsQueryParams) {
  const key = useMemo(
    () =>
      params.buckets.length
        ? [
            "orderExecutionStats",
            params.chainId,
            params.buckets.map((bucket) => `${bucket.fromTimestamp}-${bucket.toTimestamp}`).join(","),
            params.orderTypes.join(","),
            params.marketAddresses.join(","),
            params.disabledFailureReasons
              .map((row) => row.key)
              .sort()
              .join(","),
          ]
        : null,
    [params.buckets, params.chainId, params.disabledFailureReasons, params.marketAddresses, params.orderTypes]
  );

  return useSWR<OrderExecutionStatsResponse>(key, () => fetchOrderExecutionStats(params), {
    refreshInterval: 60 * 1000,
  });
}

function useOrderFailureReasons({
  chainId,
  range,
  orderTypes,
  marketAddresses,
}: {
  chainId: number;
  range: TimeRange;
  orderTypes: OrderType[];
  marketAddresses: string[];
}) {
  const key = useMemo(
    () => [
      "orderFailureReasons",
      chainId,
      range.fromTimestamp,
      range.toTimestamp,
      orderTypes.join(","),
      marketAddresses.join(","),
    ],
    [chainId, marketAddresses, orderTypes, range.fromTimestamp, range.toTimestamp]
  );

  return useSWR<OrderFailureReasonsResponse>(
    key,
    () =>
      fetchOrderFailureReasons({
        chainId,
        range,
        orderTypes,
        marketAddresses,
      }),
    {
      refreshInterval: 60 * 1000,
    }
  );
}

async function fetchOrderExecutionStats({
  chainId,
  buckets,
  orderTypes,
  marketAddresses,
  disabledFailureReasons,
}: OrderExecutionStatsQueryParams): Promise<OrderExecutionStatsResponse> {
  const client = getSubsquidGraphClient(chainId);

  if (!client || buckets.length === 0) {
    return emptyResponse(buckets);
  }

  const countsByBucketIndex = new Map<
    number,
    {
      executedCount: number;
      unsuccessfulCount: number;
      totalCount: number;
    }
  >();

  for (let startIndex = 0; startIndex < buckets.length; startIndex += CHART_BUCKETS_QUERY_BATCH_SIZE) {
    const batch = buckets.slice(startIndex, startIndex + CHART_BUCKETS_QUERY_BATCH_SIZE);
    const fields = batch
      .map((bucket, batchIndex) => {
        const index = startIndex + batchIndex;
        const executedWhere = buildOrderExecutionFilters({
          range: bucket,
          eventNames: [TradeActionType.OrderExecuted],
          orderTypes,
          marketAddresses,
        });
        const unsuccessfulWhere = buildOrderExecutionFilters({
          range: bucket,
          eventNames: UNSUCCESSFUL_ORDER_EVENTS,
          orderTypes,
          marketAddresses,
          disabledFailureReasons,
        });

        return `
          bucket${index}Executed: tradeActionsConnection(orderBy: id_ASC, where: ${executedWhere}) {
            totalCount
          }
          bucket${index}Unsuccessful: tradeActionsConnection(orderBy: id_ASC, where: ${unsuccessfulWhere}) {
            totalCount
          }
        `;
      })
      .join("\n");

    const result = await client.query({
      query: gql(`
        query OrderExecutionStats {
          ${fields}
        }
      `),
      fetchPolicy: "no-cache",
    });

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
      const index = startIndex + batchIndex;
      const executedCount = result.data?.[`bucket${index}Executed`]?.totalCount ?? 0;
      const unsuccessfulCount = result.data?.[`bucket${index}Unsuccessful`]?.totalCount ?? 0;
      const totalCount = executedCount + unsuccessfulCount;

      countsByBucketIndex.set(index, {
        executedCount,
        unsuccessfulCount,
        totalCount,
      });
    }
  }

  const chartData = buckets.map((bucket, index) => {
    const counts = countsByBucketIndex.get(index);
    const executedCount = counts?.executedCount ?? 0;
    const unsuccessfulCount = counts?.unsuccessfulCount ?? 0;
    const totalCount = counts?.totalCount ?? executedCount + unsuccessfulCount;

    return buildStatsPoint({
      bucket,
      executedCount,
      unsuccessfulCount,
      totalCount,
    });
  });

  const summary = chartData.reduce<OrderExecutionStatsSummary>(
    (acc, point) => {
      acc.executedCount += point.executedCount;
      acc.unsuccessfulCount += point.unsuccessfulCount;
      acc.totalCount += point.totalCount;
      return acc;
    },
    { executedCount: 0, unsuccessfulCount: 0, totalCount: 0, successRate: null }
  );

  summary.successRate = calculateSuccessRate(summary.executedCount, summary.totalCount);

  return {
    chartData,
    summary,
  };
}

async function fetchOrderFailureReasons({
  chainId,
  range,
  orderTypes,
  marketAddresses,
}: {
  chainId: number;
  range: TimeRange;
  orderTypes: OrderType[];
  marketAddresses: string[];
}): Promise<OrderFailureReasonsResponse> {
  const client = getSubsquidGraphClient(chainId);

  if (!client) {
    return {
      rows: [],
      totalCount: 0,
      fetchedCount: 0,
      isTruncated: false,
    };
  }

  const where = buildOrderExecutionFilters({
    range,
    eventNames: UNSUCCESSFUL_ORDER_EVENTS,
    orderTypes,
    marketAddresses,
  });

  const countResult = await client.query({
    query: gql(`
      query FailureReasonsCount {
        failedOrders: tradeActionsConnection(orderBy: id_ASC, where: ${where}) {
          totalCount
        }
      }
    `),
    fetchPolicy: "no-cache",
  });

  const totalCount = countResult.data?.failedOrders?.totalCount ?? 0;
  const maxEventsToFetch = Math.min(totalCount, MAX_FAILURE_REASON_EVENTS);
  const reasonCounts = new Map<string, Omit<OrderFailureReasonRow, "percentage">>();
  let fetchedCount = 0;

  while (fetchedCount < maxEventsToFetch) {
    const limit = Math.min(FAILURE_REASONS_PAGE_SIZE, maxEventsToFetch - fetchedCount);
    const pageResult = await client.query({
      query: gql(`
        query FailureReasons {
          failedOrders: tradeActions(
            offset: ${fetchedCount}
            limit: ${limit}
            orderBy: timestamp_DESC
            where: ${where}
          ) {
            reason
            reasonBytes
            orderType
          }
        }
      `),
      fetchPolicy: "no-cache",
    });

    const failedOrders = (pageResult.data?.failedOrders || []) as {
      reason?: string | null;
      reasonBytes?: string | null;
      orderType?: OrderType | null;
    }[];

    for (const order of failedOrders) {
      const failureReason = getFailureReason(order.reason, order.reasonBytes, order.orderType);
      const existing = reasonCounts.get(failureReason.key);

      if (existing) {
        existing.count += 1;
      } else {
        reasonCounts.set(failureReason.key, {
          ...failureReason,
          count: 1,
        });
      }
    }

    fetchedCount += failedOrders.length;

    if (failedOrders.length < limit) {
      break;
    }
  }

  const rows = Array.from(reasonCounts.values())
    .sort((a, b) => b.count - a.count)
    .map((row) => ({
      ...row,
      percentage: fetchedCount > 0 ? (row.count / fetchedCount) * 100 : null,
    }));

  return {
    rows,
    totalCount,
    fetchedCount,
    isTruncated: fetchedCount < totalCount,
  };
}

function buildOrderExecutionFilters({
  range,
  eventNames,
  orderTypes,
  marketAddresses,
  disabledFailureReasons,
}: {
  range: TimeRange;
  eventNames: TradeActionType[];
  orderTypes: OrderType[];
  marketAddresses: string[];
  disabledFailureReasons?: OrderFailureReasonRow[];
}) {
  const filters: GraphQlFilters[] = [
    {
      timestamp_gte: range.fromTimestamp,
      timestamp_lt: range.toTimestamp,
      eventName_in: eventNames,
      orderType_in: orderTypes.length ? orderTypes : undefined,
      orderType_not_eq: OrderType.Liquidation,
    },
  ];

  if (marketAddresses.length) {
    filters.push({
      OR: [
        {
          marketAddress_in: marketAddresses,
        },
        {
          swapPath_containsAny: marketAddresses,
        },
      ],
    });
  }

  if (disabledFailureReasons?.length) {
    filters.push(...disabledFailureReasons.map((row) => row.exclusionFilter));
  }

  return buildFiltersBody({ AND: filters });
}

function emptyResponse(buckets: Bucket[]): OrderExecutionStatsResponse {
  return {
    chartData: buckets.map((bucket) =>
      buildStatsPoint({
        bucket,
        executedCount: 0,
        unsuccessfulCount: 0,
        totalCount: 0,
      })
    ),
    summary: {
      executedCount: 0,
      unsuccessfulCount: 0,
      totalCount: 0,
      successRate: null,
    },
  };
}

function buildStatsPoint({
  bucket,
  executedCount,
  unsuccessfulCount,
  totalCount,
}: {
  bucket: Bucket;
  executedCount: number;
  unsuccessfulCount: number;
  totalCount: number;
}): OrderExecutionStatsPoint {
  return {
    fromTimestamp: bucket.fromTimestamp,
    toTimestamp: bucket.toTimestamp,
    dateCompact: formatBucketLabel(bucket),
    dateTooltip: formatBucketTooltip(bucket),
    executedCount,
    unsuccessfulCount,
    totalCount,
    successRate: calculateSuccessRate(executedCount, totalCount),
  };
}

function getSelectedRange(startDate: Date | undefined, endDate: Date | undefined): TimeRange {
  const now = Math.floor(Date.now() / 1000);
  const [fromRangeTimestamp, toRangeTimestamp] = normalizeDateRange(startDate, endDate);
  const fromTimestamp = fromRangeTimestamp ?? ORDER_STATS_MIN_TIMESTAMP;
  const toTimestamp = toRangeTimestamp ?? now;

  if (fromTimestamp >= toTimestamp) {
    return {
      fromTimestamp,
      toTimestamp: fromTimestamp + SECONDS_IN_HOUR,
    };
  }

  return {
    fromTimestamp,
    toTimestamp,
  };
}

function buildBuckets(fromTimestamp: number, toTimestamp: number, bucketSizeKey: BucketSizeKey): Bucket[] {
  const normalizedToTimestamp = Math.max(fromTimestamp + SECONDS_IN_HOUR, toTimestamp);
  const bucketSize = getBucketSize(bucketSizeKey, normalizedToTimestamp - fromTimestamp);
  const buckets: Bucket[] = [];

  for (let cursor = fromTimestamp; cursor < normalizedToTimestamp; cursor += bucketSize) {
    buckets.push({
      fromTimestamp: cursor,
      toTimestamp: Math.min(cursor + bucketSize, normalizedToTimestamp),
    });
  }

  return buckets;
}

function getBucketSize(bucketSizeKey: BucketSizeKey, rangeSeconds: number) {
  if (bucketSizeKey !== "auto" && isBucketSizeValid(bucketSizeKey, rangeSeconds)) {
    return BUCKET_SIZE_SECONDS[bucketSizeKey];
  }

  const bucketSizes = Object.values(BUCKET_SIZE_SECONDS);

  return bucketSizes.find((bucketSize) => Math.ceil(rangeSeconds / bucketSize) <= MAX_BUCKETS) ?? SECONDS_IN_MONTH;
}

function isBucketSizeValid(bucketSizeKey: BucketSizeKey, rangeSeconds: number) {
  if (bucketSizeKey === "auto") {
    return true;
  }

  return Math.ceil(rangeSeconds / BUCKET_SIZE_SECONDS[bucketSizeKey]) <= MAX_BUCKETS;
}

function getBucketSizeLabel(bucketSizeKey: BucketSizeKey) {
  switch (bucketSizeKey) {
    case "auto":
      return t`Auto`;
    case "1h":
      return t`1 hour`;
    case "6h":
      return t`6 hours`;
    case "1d":
      return t`1 day`;
    case "1w":
      return t`1 week`;
    case "1mo":
      return t`1 month`;
  }
}

function calculateSuccessRate(executedCount: number, totalCount: number) {
  if (totalCount === 0) {
    return null;
  }

  return (executedCount / totalCount) * 100;
}

function formatBucketLabel(bucket: Bucket) {
  const bucketRange = bucket.toTimestamp - bucket.fromTimestamp;
  const date = new Date(bucket.fromTimestamp * 1000);

  if (bucketRange <= SECONDS_IN_HOUR) {
    return format(date, "HH:mm");
  }

  if (bucketRange <= SECONDS_IN_WEEK) {
    return format(date, "MMM d");
  }

  return format(date, "MMM yyyy");
}

function formatBucketTooltip(bucket: Bucket) {
  const endTimestamp = Math.max(bucket.fromTimestamp, bucket.toTimestamp - 1);

  return `${formatDateTime(bucket.fromTimestamp)} - ${formatDateTime(endTimestamp)}`;
}

function formatSuccessRate(value: number | null | undefined) {
  if (value === null || value === undefined || !isFinite(value)) {
    return "-";
  }

  return `${formatAmount(BigInt(Math.round(value * 100)), 2, 2)}%`;
}

function formatYAxisPercentage(value: number) {
  return `${value}%`;
}

function formatCompactCount(value: number) {
  if (!isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number | undefined) {
  if (value === undefined) {
    return "-";
  }

  return numberWithCommas(value);
}

function getFailureReason(
  reason: string | null | undefined,
  reasonBytes: string | null | undefined,
  orderType: OrderType | null | undefined
) {
  const trimmedReason = reason?.trim();
  const trimmedReasonBytes = normalizeReasonBytes(reasonBytes);

  if (trimmedReasonBytes) {
    const decodedReason = tryDecodeFailureReasonBytes(trimmedReasonBytes, isMarketOrderType(orderType));

    if (decodedReason) {
      return decodedReason;
    }
  }

  if (trimmedReason) {
    return {
      key: `reason-${trimmedReason}`,
      reason: trimmedReason,
      reasonDetails: undefined,
      exclusionFilter: {
        reason_not_eq: trimmedReason,
      },
    };
  }

  if (trimmedReasonBytes) {
    return {
      key: `bytes-${trimmedReasonBytes}`,
      reason: t`Unknown reason ${getReasonBytesSelector(trimmedReasonBytes)}`,
      reasonDetails: trimmedReasonBytes,
      exclusionFilter: {
        reasonBytes_not_eq: trimmedReasonBytes,
      },
    };
  }

  return {
    key: "unknown",
    reason: t`Unknown`,
    reasonDetails: undefined,
    exclusionFilter: {
      OR: [
        {
          reason_not_eq: "",
        },
        {
          reasonBytes_isNull: false,
        },
      ],
    },
  };
}

function isMarketOrderType(orderType: OrderType | null | undefined) {
  return orderType !== undefined && orderType !== null && MARKET_ORDER_TYPES.includes(orderType);
}

function normalizeReasonBytes(reasonBytes: string | null | undefined): `0x${string}` | undefined {
  const trimmedReasonBytes = reasonBytes?.trim();

  if (!trimmedReasonBytes) {
    return undefined;
  }

  return trimmedReasonBytes.startsWith("0x")
    ? (trimmedReasonBytes as `0x${string}`)
    : (`0x${trimmedReasonBytes}` as `0x${string}`);
}

function getReasonBytesSelector(reasonBytes: `0x${string}`) {
  return reasonBytes.length >= 10 ? reasonBytes.slice(0, 10) : reasonBytes;
}

function tryDecodeFailureReasonBytes(reasonBytes: `0x${string}`, isMarketOrder: boolean) {
  const customError = tryDecodeCustomError(reasonBytes);

  if (customError) {
    const selector = getReasonBytesSelector(reasonBytes);

    return {
      key: `custom-${customError.name}-${isMarketOrder ? "market" : "trigger"}`,
      reason: getErrorTooltipTitle(customError.name, isMarketOrder),
      reasonDetails: customError.name,
      exclusionFilter: {
        OR: [
          {
            reasonBytes_not_startsWith: selector,
          },
          isMarketOrder
            ? {
                orderType_not_in: MARKET_ORDER_TYPES,
              }
            : {
                orderType_in: MARKET_ORDER_TYPES,
              },
        ],
      },
    };
  }

  const standardError = tryDecodeStandardError(reasonBytes);

  if (standardError) {
    return standardError;
  }
}

function tryDecodeStandardError(reasonBytes: `0x${string}`) {
  try {
    if (reasonBytes.startsWith(STANDARD_ERROR_SELECTOR)) {
      const [message] = decodeAbiParameters([{ type: "string" }], `0x${reasonBytes.slice(10)}` as `0x${string}`);
      const reason = String(message);

      return {
        key: `error-${reason}`,
        reason,
        reasonDetails: "Error(string)",
        exclusionFilter: {
          reasonBytes_not_eq: reasonBytes,
        },
      };
    }

    if (reasonBytes.startsWith(PANIC_ERROR_SELECTOR)) {
      const [panicCode] = decodeAbiParameters([{ type: "uint256" }], `0x${reasonBytes.slice(10)}` as `0x${string}`);
      const panicCodeHex = `0x${panicCode.toString(16).padStart(2, "0")}`;
      const reason = PANIC_REASON_BY_CODE[panicCodeHex] ?? "unknown panic";

      return {
        key: `panic-${panicCodeHex}`,
        reason: `Panic: ${reason}`,
        reasonDetails: `Panic(${panicCodeHex})`,
        exclusionFilter: {
          reasonBytes_not_eq: reasonBytes,
        },
      };
    }
  } catch {
    return undefined;
  }
}

function SummaryCard({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={cx("OrderExecutionStats-summary-card", { primary })}>
      <div className="OrderExecutionStats-summary-label">{label}</div>
      <div className="OrderExecutionStats-summary-value numbers">{value}</div>
    </div>
  );
}

function FailureReasonsTable({
  data,
  error,
  isLoading,
  disabledReasonKeys,
  onReasonEnabledChange,
  onReasonsEnabledChange,
}: {
  data: OrderFailureReasonsResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  disabledReasonKeys: Set<string>;
  onReasonEnabledChange: (key: string, isEnabled: boolean) => void;
  onReasonsEnabledChange: (keys: string[], isEnabled: boolean) => void;
}) {
  const rows = useMemo(() => data?.rows || [], [data?.rows]);
  const rowKeys = useMemo(() => rows.map((row) => row.key), [rows]);
  const [areOnlySomeReasonsEnabled, areAllReasonsEnabled] = useMemo(() => {
    const enabledCount = rows.filter((row) => !disabledReasonKeys.has(row.key)).length;

    return [enabledCount > 0 && enabledCount < rows.length, rows.length > 0 && enabledCount === rows.length];
  }, [disabledReasonKeys, rows]);

  const handleAllReasonsEnabledChange = useCallback(() => {
    onReasonsEnabledChange(rowKeys, !areAllReasonsEnabled);
  }, [areAllReasonsEnabled, onReasonsEnabledChange, rowKeys]);

  return (
    <div className="OrderExecutionStats-table-card">
      <div className="OrderExecutionStats-table-header">
        <div>
          <div className="OrderExecutionStats-chart-title">
            <Trans>Failure reasons</Trans>
          </div>
          <div className="OrderExecutionStats-chart-subtitle">
            <Trans>Cancelled and frozen orders grouped by reason</Trans>
          </div>
        </div>
        {data?.isTruncated && (
          <div className="OrderExecutionStats-table-note">
            <Trans>
              Showing first {formatCount(data.fetchedCount)} failures out of {formatCount(data.totalCount)}
            </Trans>
          </div>
        )}
      </div>

      <div className="OrderExecutionStats-table-wrap">
        <table className="OrderExecutionStats-table">
          <colgroup>
            <col className="OrderExecutionStats-checkbox-column" />
            <col className="OrderExecutionStats-reason-column" />
            <col className="OrderExecutionStats-count-column" />
            <col className="OrderExecutionStats-share-column" />
          </colgroup>
          <thead>
            <TableTheadTr>
              <TableTh aria-label={t`Included`} className="cursor-pointer" onClick={handleAllReasonsEnabledChange}>
                <Checkbox
                  isPartialChecked={areOnlySomeReasonsEnabled}
                  isChecked={areAllReasonsEnabled}
                  setIsChecked={handleAllReasonsEnabledChange}
                  className="OrderExecutionStats-row-checkbox"
                />
              </TableTh>
              <TableTh>
                <Trans>REASON</Trans>
              </TableTh>
              <TableTh>
                <Trans>COUNT</Trans>
              </TableTh>
              <TableTh>
                <Trans>SHARE</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isEnabled = !disabledReasonKeys.has(row.key);

              return (
                <tr key={row.key} className={cx({ disabled: !isEnabled })}>
                  <td>
                    <Checkbox
                      isChecked={isEnabled}
                      setIsChecked={(nextIsEnabled) => onReasonEnabledChange(row.key, nextIsEnabled)}
                      className="OrderExecutionStats-row-checkbox"
                    />
                  </td>
                  <td>
                    <div className="OrderExecutionStats-reason-cell">
                      <span title={row.reason}>{row.reason}</span>
                      {row.reasonDetails && row.reasonDetails !== row.reason && (
                        <span className="OrderExecutionStats-reason-details" title={row.reasonDetails}>
                          {row.reasonDetails}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="numbers">{formatCount(row.count)}</td>
                  <td className="numbers">{formatSuccessRate(row.percentage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isLoading && (
          <div className="OrderExecutionStats-table-overlay">
            <Loader />
          </div>
        )}
        {error && (
          <div className="OrderExecutionStats-table-overlay text-red-500">
            <Trans>Failed to load failure reasons</Trans>
          </div>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <div className="OrderExecutionStats-table-empty text-typography-secondary">
            <Trans>No failed orders for selected filters</Trans>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="OrderExecutionStats-legend-item">
      <div className={cx("OrderExecutionStats-legend-dot", className)} />
      {label}
    </div>
  );
}

function OrderExecutionStatsTooltip({
  active,
  payload,
}: TooltipProps<number | string, "successRate" | "executedCount" | "unsuccessfulCount">) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as OrderExecutionStatsPoint;

  return (
    <div className="OrderExecutionStats-tooltip">
      <StatsTooltipRow label={t`Time`} value={point.dateTooltip} showDollar={false} />
      <StatsTooltipRow label={t`Success rate`} value={formatSuccessRate(point.successRate)} showDollar={false} />
      <StatsTooltipRow label={t`Executed`} value={formatCount(point.executedCount)} showDollar={false} />
      <StatsTooltipRow label={t`Cancelled / frozen`} value={formatCount(point.unsuccessfulCount)} showDollar={false} />
      <StatsTooltipRow label={t`Terminal orders`} value={formatCount(point.totalCount)} showDollar={false} />
    </div>
  );
}
