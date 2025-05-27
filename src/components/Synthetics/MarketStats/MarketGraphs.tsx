import { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import cx from "classnames";
import format from "date-fns/format";
import { ReactNode, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { USD_DECIMALS } from "config/factors";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  GlvOrMarketInfo,
  MarketTokensAPRData,
  useMarketTokensData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { isGlvEnabled, isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot, PriceSnapshot, formatPerformanceBps } from "domain/synthetics/markets/performance";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { AprSnapshot, useGmGlvAprSnapshots } from "domain/synthetics/markets/useGmGlvAprSnapshots";
import { useGmGlvPerformance } from "domain/synthetics/markets/useGmGlvPerformance";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { POOLS_TIME_RANGE_OPTIONS, convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/usePoolsTimeRange";
import { PoolsTimeRange, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { TokensData, getMidPrice } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { useLocalizedMap } from "lib/i18n";
import { bigintToNumber, formatPercentage, formatUsdPrice, parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { PoolsDetailsCard } from "pages/PoolsDetails/PoolsDetailsCard";

import { PoolsTabs } from "../PoolsTabs/PoolsTabs";

const MARKET_GRAPHS_TYPES = ["performance", "price", "feeApr"] as const;

export type MarketGraphType = (typeof MARKET_GRAPHS_TYPES)[number];

const MARKET_GRAPHS_TABS_LABELS: Record<MarketGraphType, MessageDescriptor> = {
  performance: msg`Performance`,
  price: msg`Price`,
  feeApr: msg`Fee APR`,
};

const MARKET_GRAPHS_TITLE_LABELS: Record<MarketGraphType, MessageDescriptor> = {
  performance: msg`Annualized Performance`,
  price: msg`Current Price`,
  feeApr: msg`Fee APY`,
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
    return [glvOrMarketInfo.longTokenAddress, glvOrMarketInfo.shortTokenAddress, address];
  }, [glvOrMarketInfo.longTokenAddress, glvOrMarketInfo.shortTokenAddress, address]);

  const { glvPerformance, gmPerformance, glvPerformanceSnapshots, gmPerformanceSnapshots, prices } =
    useGmGlvPerformance({
      chainId,
      period: convertPoolsTimeRangeToPeriod(timeRange),
      gmData: onlyGmMarketsInfoData,
      glvData,
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
                glvOrMarketInfo,
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
                ? glvPerformanceSnapshots[glvOrMarketInfo.glvTokenAddress]
                : gmPerformanceSnapshots[glvOrMarketInfo.marketTokenAddress]) ?? EMPTY_ARRAY
            }
            priceSnapshots={priceSnapshotsByAddress}
            marketGraphType={marketGraphType}
            aprSnapshots={aprSnapshotsByAddress}
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

  const data = useMemo(
    (): Record<MarketGraphType, GraphData[]> => ({
      performance: performanceData,
      price: priceData,
      feeApr: apyData,
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

const GraphValue = ({ value, label }: { value: string | undefined; label: ReactNode }) => {
  return (
    <div className="flex items-center gap-8">
      <span className="text-[24px]">{value ?? "..."}</span>
      <span className="text-body-medium text-slate-100">{label}</span>
    </div>
  );
};
