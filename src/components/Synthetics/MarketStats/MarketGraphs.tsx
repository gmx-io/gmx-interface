import { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import cx from "classnames";
import format from "date-fns/format";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { USD_DECIMALS } from "config/factors";
import { GlvOrMarketInfo, MarketTokensAPRData, useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot, PriceSnapshot, formatPerformanceBps } from "domain/synthetics/markets/performance";
import { AprSnapshot, useGmGlvAprSnapshots } from "domain/synthetics/markets/useGmGlvAprSnapshots";
import { useGmGlvPerformanceAnnualized } from "domain/synthetics/markets/useGmGlvPerformanceAnnualized";
import { useGmGlvPerformanceSnapshots } from "domain/synthetics/markets/useGmGlvPerformanceSnapshots";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { POOLS_TIME_RANGE_OPTIONS, convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/usePoolsTimeRange";
import { PoolsTimeRange, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { usePriceSnapshots } from "domain/synthetics/markets/usePriceSnapshots";
import { TokensData, getMidPrice } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { bigintToNumber, formatPercentage, formatUsdPrice, parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import Tabs from "components/Tabs/Tabs";

import { FeeApyLabel } from "../GmList/FeeApyLabel";
import { PerformanceLabel } from "../GmList/PerformanceLabel";
import { PoolsTabs } from "../PoolsTabs/PoolsTabs";

const MARKET_GRAPHS_TYPES = ["performance", "price", "feeApr"] as const;

export type MarketGraphType = (typeof MARKET_GRAPHS_TYPES)[number];

const MARKET_GRAPHS_TABS_LABELS: Record<MarketGraphType, MessageDescriptor> = {
  performance: msg`Performance`,
  price: msg`Price`,
  feeApr: msg`Fee APR`,
};

const getGraphValue = ({
  marketGraphType,
  glvOrMarketInfo,
  glvPerformance,
  gmPerformance,
  marketsTokensApyData,
  glvApyInfoData,
  marketTokensData,
}: {
  marketGraphType: MarketGraphType;
  glvOrMarketInfo: GlvOrMarketInfo;
  glvPerformance: Record<string, number>;
  gmPerformance: Record<string, number>;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  glvApyInfoData: MarketTokensAPRData | undefined;
  marketTokensData: TokensData | undefined;
}) => {
  const isGlv = isGlvInfo(glvOrMarketInfo);
  const address = isGlv ? glvOrMarketInfo.glvTokenAddress : glvOrMarketInfo.marketTokenAddress;
  const apy = isGlv
    ? getByKey(glvApyInfoData, glvOrMarketInfo.glvTokenAddress)
    : getByKey(marketsTokensApyData, glvOrMarketInfo.marketTokenAddress);
  const tokenPrice = marketTokensData?.[address]?.prices.minPrice;
  const performance = isGlv ? glvPerformance[address] : gmPerformance[address];
  const valuesMap: Record<MarketGraphType, string | undefined> = {
    performance: performance ? formatPerformanceBps(performance) : undefined,
    price: tokenPrice ? formatUsdPrice(tokenPrice) : undefined,
    feeApr: apy ? formatPercentage(apy, { bps: false }) : undefined,
  };

  return valuesMap[marketGraphType];
};

export function MarketGraphs({ glvOrMarketInfo }: { glvOrMarketInfo: GlvOrMarketInfo }) {
  const [marketGraphType, setMarketGraphType] = useState<MarketGraphType>(MARKET_GRAPHS_TYPES[0]);
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const address = isGlvInfo(glvOrMarketInfo) ? glvOrMarketInfo.glvTokenAddress : glvOrMarketInfo.marketTokenAddress;

  const { chainId, srcChainId } = useChainId();

  const { marketsTokensApyData, glvApyInfoData } = useGmMarketsApy(chainId, srcChainId, { period: timeRange });

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: true, withGlv: true });

  const tokenAddresses = useMemo(() => {
    return [glvOrMarketInfo.longTokenAddress, glvOrMarketInfo.shortTokenAddress, address];
  }, [glvOrMarketInfo.longTokenAddress, glvOrMarketInfo.shortTokenAddress, address]);

  const { glvPerformance, gmPerformance } = useGmGlvPerformanceAnnualized({
    chainId,
    period: timeRange,
  });

  const { glvPerformanceSnapshots, gmPerformanceSnapshots } = useGmGlvPerformanceSnapshots({
    chainId,
    period: timeRange,
  });

  const { prices } = usePriceSnapshots({
    chainId,
    period: convertPoolsTimeRangeToPeriod(timeRange),
    tokenAddresses,
  });

  const { aprSnapshots } = useGmGlvAprSnapshots({
    chainId,
    period: convertPoolsTimeRangeToPeriod(timeRange),
    tokenAddresses: [address],
  });

  const isGlv = isGlvInfo(glvOrMarketInfo);

  const aprSnapshotsByAddress = aprSnapshots?.[address] ?? EMPTY_ARRAY;
  const priceSnapshotsByAddress = prices?.[address] ?? EMPTY_ARRAY;

  const isMobile = usePoolsIsMobilePage();

  const timeRangeTabs = useMemo(
    () =>
      POOLS_TIME_RANGE_OPTIONS.map((timeRange) => ({
        label: timeRange === "total" ? t`Total` : timeRange,
        value: timeRange,
      })),
    []
  );

  const graphTitleLabelMap = {
    performance: <PerformanceLabel short={false} variant="none" />,
    price: t`Current Price`,
    feeApr: <FeeApyLabel variant="none" />,
  };

  const poolsTabs = (
    <PoolsTabs<PoolsTimeRange>
      tabs={timeRangeTabs}
      selected={timeRange}
      setSelected={setTimeRange}
      className={isMobile ? "w-full gap-4" : undefined}
      itemClassName={isMobile ? "text-center grow" : undefined}
    />
  );

  const marketGraphsTabsLabelMap = useLocalizedMap(MARKET_GRAPHS_TABS_LABELS);

  const marketGraphsTabs = useMemo(
    () =>
      MARKET_GRAPHS_TYPES.map((type) => ({
        label: marketGraphsTabsLabelMap[type],
        value: type,
      })),
    [marketGraphsTabsLabelMap]
  );

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <Tabs<MarketGraphType>
        type="block"
        options={marketGraphsTabs}
        selectedValue={marketGraphType}
        onChange={setMarketGraphType}
      />
      <div className="flex p-20">
        <div className="flex grow flex-col gap-20">
          <div className={cx("grid", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
            <GraphValue
              value={getGraphValue({
                marketGraphType,
                glvOrMarketInfo,
                glvPerformance,
                gmPerformance,
                glvApyInfoData,
                marketsTokensApyData,
                marketTokensData,
              })}
              label={graphTitleLabelMap[marketGraphType]}
              valueClassName={cx("normal-nums", {
                "text-green-300":
                  marketGraphType === "performance" && (glvPerformance[address] > 0 || gmPerformance[address] > 0),
              })}
            />
            {!isMobile ? <div className="ml-auto">{poolsTabs}</div> : null}
          </div>
          <GraphChart
            performanceSnapshots={
              (isGlv
                ? glvPerformanceSnapshots[glvOrMarketInfo.glvTokenAddress]
                : gmPerformanceSnapshots[glvOrMarketInfo.marketTokenAddress]) ?? EMPTY_ARRAY
            }
            priceSnapshots={priceSnapshotsByAddress}
            marketGraphType={marketGraphType}
            aprSnapshots={aprSnapshotsByAddress}
          />
        </div>
      </div>
      {isMobile ? (
        <div className="flex justify-center border-t-1/2 border-t-slate-600 px-16 py-12">{poolsTabs}</div>
      ) : null}
    </div>
  );
}

const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-blue-300)",
  fill: "var(--color-slate-900)",
};

const DOT_PROPS = {
  r: 0,
};

const GRAPH_MARGIN = { top: 5, right: 0, bottom: 0, left: 0 };

type GraphData = {
  value: number;
  snapshotTimestamp: Date;
};

const valueFormatter = (marketGraphType: MarketGraphType) => (value: number) => {
  if (value === 0) {
    return "0";
  }

  const valueMap: Record<MarketGraphType, string> = {
    performance: formatPerformanceBps(value),
    price: formatUsdPrice(parseValue(value.toString(), USD_DECIMALS) ?? 0n) || "",
    feeApr: `${Number(value.toFixed(2))}%`,
  };

  return valueMap[marketGraphType];
};

const axisValueFormatter = (marketGraphType: MarketGraphType) => (value: number) => {
  if (value === 0) {
    return "0";
  }

  const valueMap: Record<MarketGraphType, string> = {
    performance: formatPerformanceBps(value),
    price: value.toString(),
    feeApr: `${Number(value.toFixed(2))}%`,
  };

  return valueMap[marketGraphType];
};

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

const AXIS_TICK_PROPS = { fill: "var(--color-slate-100)", fontSize: 12, fontWeight: 500 };

const GraphChart = ({
  performanceSnapshots,
  priceSnapshots,
  marketGraphType,
  aprSnapshots,
}: {
  performanceSnapshots: PerformanceSnapshot[];
  priceSnapshots: PriceSnapshot[];
  marketGraphType: MarketGraphType;
  aprSnapshots: AprSnapshot[];
}) => {
  const performanceData = useMemo(
    () =>
      performanceSnapshots.map((snapshot) => ({
        snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
        value: snapshot.performance,
      })),
    [performanceSnapshots]
  );

  const priceData = useMemo(
    () =>
      priceSnapshots.map((snapshot) => ({
        snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
        value: bigintToNumber(
          getMidPrice({
            minPrice: BigInt(snapshot.minPrice),
            maxPrice: BigInt(snapshot.maxPrice),
          }),
          USD_DECIMALS
        ),
      })),
    [priceSnapshots]
  );

  const apyData = useMemo(
    () =>
      aprSnapshots.map((snapshot) => ({
        snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
        value: bigintToNumber(BigInt(snapshot.aprByFee) + BigInt(snapshot.aprByBorrowingFee), 28),
      })),
    [aprSnapshots]
  );

  const formatValue = useMemo(() => valueFormatter(marketGraphType), [marketGraphType]);
  const formatAxisValue = useMemo(() => axisValueFormatter(marketGraphType), [marketGraphType]);

  const isMobile = usePoolsIsMobilePage();

  const [data, setData] = useState<GraphData[]>([]);

  const prevMarketGraphType = usePrevious(marketGraphType);

  useEffect(() => {
    const dataMap = {
      performance: performanceData,
      price: priceData,
      feeApr: apyData,
    };

    if (prevMarketGraphType !== marketGraphType || dataMap[marketGraphType].length > 0) {
      setData(dataMap[marketGraphType]);
    }
  }, [performanceData, priceData, apyData, marketGraphType, prevMarketGraphType]);

  return (
    <div>
      <ResponsiveContainer height={isMobile ? 260 : 300} width="100%">
        {/* @ts-expect-error */}
        <AreaChart data={data} margin={GRAPH_MARGIN} key={marketGraphType} overflow="visible">
          <defs>
            <linearGradient id="market-graph-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="-45%" stopColor="var(--color-blue-300)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--color-blue-300)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />

          <Tooltip cursor={CHART_CURSOR_PROPS} content={<GraphTooltip formatValue={formatValue} />} />
          <Area
            key={marketGraphType}
            type="linear"
            dataKey="value"
            stroke="var(--color-blue-300)"
            fill="url(#market-graph-gradient)"
            strokeWidth={2}
            dot={DOT_PROPS}
            activeDot={ACTIVE_DOT_PROPS}
            animationEasing="ease-in-out"
            animationDuration={750}
            animateNewValues={true}
            baseValue="dataMin"
          />
          <XAxis
            dataKey="snapshotTimestamp"
            tickFormatter={(value) => format(value, "dd/MM")}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK_PROPS}
            minTickGap={isMobile ? 16 : 32}
            tickMargin={8}
          />
          <YAxis
            dataKey="value"
            tickFormatter={formatAxisValue}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK_PROPS}
            width={44}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const GraphTooltip = ({ active, payload, formatValue }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as GraphData;

    return (
      <div
        className={`backdrop-blur-100 text-body-small flex flex-col rounded-4 bg-[rgba(160,163,196,0.1)]
      bg-[linear-gradient(0deg,var(--color-slate-800),var(--color-slate-800))] px-12 py-8 bg-blend-overlay
      shadow-lg`}
      >
        <span className=" text-typography-secondary">{format(item.snapshotTimestamp.getTime(), "MMMM dd, yyyy")}</span>
        <span className="numbers">{formatValue(item.value)}</span>
      </div>
    );
  }

  return null;
};

const GraphValue = ({
  value,
  label,
  valueClassName,
}: {
  value: string | undefined;
  label: ReactNode;
  valueClassName?: string;
}) => {
  return (
    <div className="flex items-center gap-8">
      <span className={cx("text-h2", valueClassName)}>{value ?? "..."}</span>
      <span className="text-body-small text-typography-secondary">{label}</span>
    </div>
  );
};
