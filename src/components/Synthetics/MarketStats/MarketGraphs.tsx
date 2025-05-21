import { msg, t } from "@lingui/macro";
import cx from "classnames";
import format from "date-fns/format";
import { ReactNode, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { USD_DECIMALS } from "config/factors";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  GlvInfo,
  MarketInfo,
  MarketTokensAPRData,
  useMarketTokensData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { isGlvEnabled, isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot, PriceSnapshot } from "domain/synthetics/markets/performance";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { ApySnapshot, useGmGlvApySnapshots } from "domain/synthetics/markets/useGmGlvApySnapshots";
import { useGmGlvPerformance } from "domain/synthetics/markets/useGmGlvPerformance";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { POOLS_TIME_RANGE_OPTIONS, convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/usePoolsTimeRange";
import { PoolsTimeRange, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { TokensData } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { useLocalizedMap } from "lib/i18n";
import { bigintToNumber, formatPercentage, formatUsdPrice, parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { PoolsDetailsCard } from "pages/PoolsDetails/PoolsDetailsCard";

import { PoolsTabs } from "../PoolsTabs/PoolsTabs";

const MARKET_GRAPHS_TYPES = ["performance" as const, "price" as const, "feeApy" as const];

export type MarketGraphType = (typeof MARKET_GRAPHS_TYPES)[number];

const MARKET_GRAPHS_TABS_LABELS = {
  performance: msg`Performance`,
  price: msg`Price`,
  feeApy: msg`Fee APY`,
};

const MARKET_GRAPHS_TITLE_LABELS = {
  performance: msg`Annualized performance`,
  price: msg`Current Price`,
  feeApy: msg`Fee APY`,
};

const getGraphValue = ({
  marketGraphType,
  marketInfo,
  glvPerformance,
  gmPerformance,
  marketsTokensApyData,
  glvApyInfoData,
  marketTokensData,
}: {
  marketGraphType: MarketGraphType;
  marketInfo: GlvInfo | MarketInfo;
  glvPerformance: Record<string, number>;
  gmPerformance: Record<string, number>;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  glvApyInfoData: MarketTokensAPRData | undefined;
  marketTokensData: TokensData | undefined;
}) => {
  const isGlv = isGlvInfo(marketInfo);
  const address = isGlv ? marketInfo.glvTokenAddress : marketInfo.marketTokenAddress;
  const apy = isGlv
    ? getByKey(glvApyInfoData, marketInfo.glvTokenAddress)
    : getByKey(marketsTokensApyData, marketInfo.marketTokenAddress);
  const tokenPrice = marketTokensData?.[address]?.prices.minPrice;
  const performance = isGlv ? glvPerformance[address] : gmPerformance[address];
  const valuesMap: Record<MarketGraphType, ReactNode> = {
    performance: performance ? `${Math.round(performance * 10000) / 100}%` : "...",
    price: tokenPrice ? formatUsdPrice(tokenPrice) : "...",
    feeApy: apy ? formatPercentage(apy, { bps: false }) : "...",
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

  const { marketsTokensApyData, glvApyInfoData } = useGmMarketsApy(chainId, { period: timeRange });

  const { glvData } = useGlvMarketsInfo(enabledGlv, {
    marketsInfoData: onlyGmMarketsInfoData,
    tokensData,
    chainId,
    account,
  });

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: true, withGlv: true });

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

  const isMobile = usePoolsIsMobilePage();

  const timeRangeTabs = useMemo(
    () =>
      POOLS_TIME_RANGE_OPTIONS.map((timeRange) => ({
        label: timeRange === "total" ? t`Total` : timeRange,
        value: timeRange,
      })),
    []
  );

  const graphTitleLabelMap = useLocalizedMap(MARKET_GRAPHS_TITLE_LABELS);

  const poolsTabs = <PoolsTabs<PoolsTimeRange> tabs={timeRangeTabs} selected={timeRange} setSelected={setTimeRange} />;

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
    <PoolsDetailsCard
      title={
        <PoolsTabs<MarketGraphType>
          tabs={marketGraphsTabs}
          selected={marketGraphType}
          setSelected={setMarketGraphType}
        />
      }
    >
      <div className="flex">
        <div className="flex grow flex-col gap-16">
          <div className={cx("grid", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
            <GraphValue
              value={getGraphValue({
                marketGraphType,
                marketInfo,
                glvPerformance,
                gmPerformance,
                glvApyInfoData,
                marketsTokensApyData,
                marketTokensData,
              })}
              label={graphTitleLabelMap[marketGraphType]}
            />
            {!isMobile ? <div className="ml-auto">{poolsTabs}</div> : null}
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
          {isMobile ? <div className="flex justify-center">{poolsTabs}</div> : null}
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

  const isMobile = usePoolsIsMobilePage();

  const axisTick = useMemo(() => ({ fill: "var(--color-slate-100)", fontSize: isMobile ? 12 : 14 }), [isMobile]);
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
            tick={axisTick}
            minTickGap={32}
          />
          <YAxis dataKey="value" tickFormatter={formatAxisValue} tickLine={false} axisLine={false} tick={axisTick} />
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
