import { Trans, t } from "@lingui/macro";
import format from "date-fns/format";
import { ReactNode, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo, MarketInfo, useMarketsInfoRequest } from "domain/synthetics/markets";
import { isGlvEnabled, isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot } from "domain/synthetics/markets/performance";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { useGmGlvPerformance } from "domain/synthetics/markets/useGmGlvPerformance";
import {
  POOLS_TIME_RANGE_OPTIONS,
  convertPoolsTimeRangeToPeriod,
} from "domain/synthetics/markets/usePoolsTimeRange";
import { PoolsTimeRange, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
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

export function MarketGraphs({ marketInfo }: { marketInfo: GlvInfo | MarketInfo }) {
  const [marketGraphType, setMarketGraphType] = useState<MarketGraphType>(MARKET_GRAPHS_TYPES[0]);
  const { timeRange, setTimeRange } = usePoolsTimeRange();

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
    if (isGlvInfo(marketInfo)) {
      return [marketInfo.longTokenAddress, marketInfo.shortTokenAddress, marketInfo.glvTokenAddress];
    }

    return [marketInfo.longTokenAddress, marketInfo.shortTokenAddress, marketInfo.marketTokenAddress];
  }, [marketInfo]);

  const { glvPerformance, gmPerformance, glvPerformanceSnapshots, gmPerformanceSnapshots } = useGmGlvPerformance({
    chainId,
    period: convertPoolsTimeRangeToPeriod(timeRange),
    gmData: onlyGmMarketsInfoData,
    glvData,
    tokenAddresses,
  });

  const isGlv = isGlvInfo(marketInfo);

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
              value={`${Math.round(
                (isGlv ? glvPerformance[marketInfo.glvTokenAddress] : gmPerformance[marketInfo.marketTokenAddress]) *
                  10000,
              ) / 100}%`}
              label={<Trans>Annualized performance</Trans>}
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

const GRAPH_MARGIN = { top: 5, right: 5, bottom: 0, left: 0 };

const GraphChart = ({ performanceSnapshots }: { performanceSnapshots: PerformanceSnapshot[] }) => {
  const data = performanceSnapshots.map((snapshot) => ({
    snapshotTimestamp: new Date(snapshot.snapshotTimestamp * 1000),
    performance: snapshot.performance,
  }));

  return (
    <div>
      <ResponsiveContainer height={300} width="100%">
        <LineChart data={data} margin={GRAPH_MARGIN}>
          <Line
            type="linear"
            dataKey="performance"
            stroke="var(--color-blue-300)"
            strokeWidth={2}
            dot={DOT_PROPS}
            activeDot={ACTIVE_DOT_PROPS}
          />
          <Tooltip cursor={false} content={<GraphTooltip />} />
          <XAxis
            dataKey="snapshotTimestamp"
            tickFormatter={(value) => format(value, "dd/MM")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-slate-100)" }}
            minTickGap={25}
          />
          <YAxis
            dataKey="performance"
            tickFormatter={(value) => (value === 0 ? "0" : `${Math.round(value * 10000) / 100}%`)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-slate-100)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const GraphTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as PerformanceSnapshot;

    return (
      <div className="rounded-4 bg-slate-600 p-10">
        {formatDate(item.snapshotTimestamp / 1000)}: {Math.round(item.performance * 10000) / 100}%
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
