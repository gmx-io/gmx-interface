import { t } from "@lingui/macro";
import format from "date-fns/format";
import { ReactNode, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { USD_DECIMALS } from "config/factors";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo, MarketInfo, useMarketsInfoRequest } from "domain/synthetics/markets";
import { isGlvEnabled, isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot, PriceSnapshot } from "domain/synthetics/markets/performance";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { ApySnapshot, useGmGlvApySnapshots } from "domain/synthetics/markets/useGmGlvApySnapshots";
import { useGmGlvPerformance } from "domain/synthetics/markets/useGmGlvPerformance";
import { POOLS_TIME_RANGE_OPTIONS, convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/usePoolsTimeRange";
import { PoolsTimeRange, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { bigintToNumber, formatPercentage, formatUsdPrice, parseValue } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { PoolsDetailsCard } from "pages/PoolsDetails/PoolsDetailsCard";

import { PoolsTabs } from "../PoolsTabs/PoolsTabs";

const MARKET_GRAPHS_TYPES = ["performance" as const, "price" as const, "feeApy" as const];

export type MarketGraphType = (typeof MARKET_GRAPHS_TYPES)[number];

const MARKET_GRAPHS_TABS_LABELS = {
  performance: t`Performance`,
  price: t`Price`,
  feeApy: t`Fee APY`,
};

const MARKET_GRAPHS_TABS = MARKET_GRAPHS_TYPES.map((type) => ({
  label: MARKET_GRAPHS_TABS_LABELS[type],
  value: type,
}));

const TIME_RANGE_TABS = POOLS_TIME_RANGE_OPTIONS.map((timeRange) => ({
  label: timeRange === "total" ? t`Total` : timeRange.toUpperCase(),
  value: timeRange,
}));

const GRAPH_VALUE_LABEL_BY_TYPE = {
  performance: t`Annualized performance`,
  price: t`Current Price`,
  feeApy: t`Fee APY`,
};

const getGraphValue = ({
  marketGraphType,
  marketInfo,
  glvPerformance,
  gmPerformance,
  priceSnapshots,
  apySnapshots,
}: {
  marketGraphType: MarketGraphType;
  marketInfo: GlvInfo | MarketInfo;
  glvPerformance: Record<string, number>;
  gmPerformance: Record<string, number>;
  priceSnapshots: PriceSnapshot[];
  apySnapshots: ApySnapshot[];
}) => {
  const isGlv = isGlvInfo(marketInfo);
  const address = isGlv ? marketInfo.glvTokenAddress : marketInfo.marketTokenAddress;
  const lastApySnapshot = apySnapshots[apySnapshots.length - 1];
  const lastPriceSnapshot = priceSnapshots[priceSnapshots.length - 1];
  const valuesMap: Record<MarketGraphType, ReactNode> = {
    performance: `${Math.round((isGlv ? glvPerformance[address] : gmPerformance[address]) * 10000) / 100}%`,
    price: lastPriceSnapshot
      ? formatUsdPrice((BigInt(lastPriceSnapshot.maxPrice) + BigInt(lastPriceSnapshot.minPrice)) / 2n)
      : "...",
    feeApy: lastApySnapshot
      ? formatPercentage(lastApySnapshot.apy, { bps: false })
      : "...",
  };

  return valuesMap[marketGraphType];
};

export function MarketGraphs({ marketInfo }: { marketInfo: GlvInfo | MarketInfo }) {
  const [marketGraphType, setMarketGraphType] = useState<MarketGraphType>(MARKET_GRAPHS_TYPES[0]);
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const address = isGlvInfo(marketInfo) ? marketInfo.glvTokenAddress : marketInfo.marketTokenAddress;

  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData: onlyGmMarketsInfoData } = useMarketsInfoRequest(chainId);
  const enabledGlv = isGlvEnabled(chainId);
  const account = useSelector(selectAccount);

  const { glvData } = useGlvMarketsInfo(enabledGlv, {
    marketsInfoData: onlyGmMarketsInfoData,
    tokensData,
    chainId,
    account,
  });

  const tokenAddresses = useMemo(() => {
    return [marketInfo.longTokenAddress, marketInfo.shortTokenAddress, address];
  }, [marketInfo.longTokenAddress, marketInfo.shortTokenAddress, address]);

  const { glvPerformance, gmPerformance, glvPerformanceSnapshots, gmPerformanceSnapshots, prices } =
    useGmGlvPerformance({
      chainId,
      period: convertPoolsTimeRangeToPeriod(timeRange),
      gmData: onlyGmMarketsInfoData,
      glvData,
      tokenAddresses,
    });

  const { apySnapshots } = useGmGlvApySnapshots({
    chainId,
    period: convertPoolsTimeRangeToPeriod(timeRange),
    tokenAddresses: [address],
  });

  const isGlv = isGlvInfo(marketInfo);

  const apySnapshotsByAddress = apySnapshots?.[address] ?? EMPTY_ARRAY;
  const priceSnapshotsByAddress = prices?.[address] ?? EMPTY_ARRAY;

  return (
    <PoolsDetailsCard
      title={
        <PoolsTabs<MarketGraphType>
          tabs={MARKET_GRAPHS_TABS}
          selected={marketGraphType}
          setSelected={setMarketGraphType}
        />
      }
    >
      <div className="flex">
        <div className="flex grow flex-col gap-16">
          <div className="grid grid-cols-2">
            <GraphValue
              value={getGraphValue({
                marketGraphType,
                marketInfo,
                glvPerformance,
                gmPerformance,
                apySnapshots: apySnapshotsByAddress,
                priceSnapshots: priceSnapshotsByAddress,
              })}
              label={GRAPH_VALUE_LABEL_BY_TYPE[marketGraphType]}
            />
            <div className="ml-auto">
              <PoolsTabs<PoolsTimeRange> tabs={TIME_RANGE_TABS} selected={timeRange} setSelected={setTimeRange} />
            </div>
          </div>
          <GraphChart
            performanceSnapshots={
              (isGlv
                ? glvPerformanceSnapshots[marketInfo.glvTokenAddress]
                : gmPerformanceSnapshots[marketInfo.marketTokenAddress]) ?? EMPTY_ARRAY
            }
            priceSnapshots={priceSnapshotsByAddress}
            marketGraphType={marketGraphType}
            apySnapshots={apySnapshotsByAddress}
          />
        </div>
      </div>
    </PoolsDetailsCard>
  );
}

const ACTIVE_DOT_PROPS = {
  r: 4,
  stroke: "var(--color-blue-300)",
};

const DOT_PROPS = {
  r: 0,
};

const GRAPH_MARGIN = { top: 5, right: 20, bottom: 0, left: 0 };

type GraphData = {
  value: number;
  snapshotTimestamp: Date;
};

const valueFormatter = (marketGraphType: MarketGraphType) => (value: number) => {
  if (value === 0) {
    return "0";
  }

  const valueMap: Record<MarketGraphType, string> = {
    performance: `${Math.round(value * 10000) / 100}%`,
    price: formatUsdPrice(parseValue(value.toString(), USD_DECIMALS) ?? 0n) || "",
    feeApy: `${Math.round(value * 100) / 100}%`,
  };

  return valueMap[marketGraphType];
};

const axisValueFormatter = (marketGraphType: MarketGraphType) => (value: number) => {
  if (value === 0) {
    return "0";
  }

  const valueMap: Record<MarketGraphType, string> = {
    performance: `${Math.round(value * 10000) / 100}%`,
    price: value.toString(),
    feeApy: `${Math.round(value * 100) / 100}%`,
  };

  return valueMap[marketGraphType];
};

const AXIS_TICK = {
  fill: "var(--color-slate-100)",
};

const GraphChart = ({
  performanceSnapshots,
  priceSnapshots,
  marketGraphType,
  apySnapshots,
}: {
  performanceSnapshots: PerformanceSnapshot[];
  priceSnapshots: PriceSnapshot[];
  marketGraphType: MarketGraphType;
  apySnapshots: ApySnapshot[];
}) => {
  const performanceData = performanceSnapshots.map((snapshot) => ({
    snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
    value: snapshot.performance,
  }));

  const priceData = priceSnapshots.map((snapshot) => ({
    snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
    value: bigintToNumber((BigInt(snapshot.maxPrice) + BigInt(snapshot.minPrice)) / 2n, USD_DECIMALS),
  }));

  const apyData = apySnapshots.map((snapshot) => ({
    snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
    value: bigintToNumber(snapshot.apy, 28),
  }));

  const data = useMemo(
    (): Record<MarketGraphType, GraphData[]> => ({
      performance: performanceData,
      price: priceData,
      feeApy: apyData,
    }),
    [performanceData, priceData, apyData]
  );

  const formatValue = useMemo(() => valueFormatter(marketGraphType), [marketGraphType]);
  const formatAxisValue = useMemo(() => axisValueFormatter(marketGraphType), [marketGraphType]);
  return (
    <div>
      <ResponsiveContainer height={300} width="100%">
        <LineChart data={data[marketGraphType]} margin={GRAPH_MARGIN}>
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--color-blue-300)"
            strokeWidth={2}
            dot={DOT_PROPS}
            activeDot={ACTIVE_DOT_PROPS}
          />
          <Tooltip cursor={false} content={<GraphTooltip formatValue={formatValue} />} />
          <XAxis
            dataKey="snapshotTimestamp"
            tickFormatter={(value) => format(value, "dd/MM")}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            minTickGap={32}
          />
          <YAxis dataKey="value" tickFormatter={formatAxisValue} tickLine={false} axisLine={false} tick={AXIS_TICK} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const GraphTooltip = ({ active, payload, formatValue }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as GraphData;

    return (
      <div className="rounded-4 bg-slate-600 p-10">
        {formatDate(item.snapshotTimestamp.getTime() / 1000)}: {formatValue(item.value)}
      </div>
    );
  }

  return null;
};

const GraphValue = ({ value, label }: { value: ReactNode; label: ReactNode }) => {
  return (
    <div className="flex items-center gap-8">
      <span className="text-[24px]">{value}</span>
      <span className="text-body-medium text-slate-100">{label}</span>
    </div>
  );
};
