import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { useProtocolStatsTimeseries } from "domain/protocolStats/useProtocolStatsTimeseries";
import {
  formatProtocolStatsUsdNumber,
  getProtocolStatsChartPoints,
  getProtocolStatsNetworkLabel,
  sumProtocolStatsValues,
} from "domain/protocolStats/utils";
import type { ProtocolStatsChartPoint } from "domain/protocolStats/utils";
import { formatDate, formatDateCompact, getTimestampByDaysAgo } from "lib/dates";
import { EMPTY_ARRAY } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { PROTOCOL_STATS_NETWORKS } from "sdk/utils/stats/types";
import type { ProtocolStatsNetwork } from "sdk/utils/stats/types";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import Loader from "components/Loader/Loader";
import { usdYAxisTickFormatter } from "components/Referrals/shared/charts/chartValueUtils";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

const VOLUME_CHART_DAYS = 30;
const PROVISIONAL_FILL_OPACITY = 0.4;

const NETWORK_SERIES: Record<ProtocolStatsNetwork, { fill: string; swatchClassName: string }> = {
  arbitrum: { fill: "var(--color-blue-300)", swatchClassName: "bg-blue-300" },
  avalanche: { fill: "var(--color-red-500)", swatchClassName: "bg-red-500" },
  megaeth: { fill: "var(--color-green-500)", swatchClassName: "bg-green-500" },
  solana: { fill: "var(--color-yellow-500)", swatchClassName: "bg-yellow-500" },
};

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
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

const CHART_MARGIN = { top: 16, right: 16, bottom: 16, left: 0 };
const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };

type VolumeChartRow = ProtocolStatsChartPoint & {
  dateCompact: string;
};

export function ProtocolStatsVolumeChart() {
  const from = getTimestampByDaysAgo(VOLUME_CHART_DAYS);
  const { data, error, isLoading } = useProtocolStatsTimeseries({ metric: "volume.total", groupBy: "network", from });
  const { isMobile } = useBreakpoints();

  const networks = useMemo(() => {
    const keys = new Set(data?.groups.map((group) => group.key));

    return PROTOCOL_STATS_NETWORKS.filter((network) => keys.has(network));
  }, [data]);

  const rows = useMemo<VolumeChartRow[]>(
    () =>
      getProtocolStatsChartPoints(data?.groups ?? EMPTY_ARRAY).map((point) => ({
        ...point,
        dateCompact: formatDateCompact(point.day, { timezone: "utc" }),
      })),
    [data]
  );

  if (error) {
    return null;
  }

  const days = VOLUME_CHART_DAYS;

  return (
    <AppCard dataQa="protocol-stats-volume-chart">
      <AppCardSection>
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="text-body-large font-medium">
            <Trans>Volume by network, last {days} days</Trans>
          </div>
          {networks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-16 text-typography-secondary">
              {networks.map((network) => (
                <div key={network} className="flex items-center gap-8 text-13 font-medium">
                  <div className={cx("inline-block size-6 rounded-full", NETWORK_SERIES[network].swatchClassName)} />
                  {getProtocolStatsNetworkLabel(network)}
                </div>
              ))}
              <TooltipWithPortal
                variant="none"
                handle={
                  <span className="inline-flex items-center gap-8 text-13 font-medium text-typography-secondary">
                    <span className="inline-block size-6 rounded-full bg-slate-100 opacity-40" />
                    <Trans>Provisional</Trans>
                    <InfoIcon className="size-16 text-typography-secondary" />
                  </span>
                }
                content={
                  <Trans>
                    Lighter bars are provisional: a source has not finalized those days yet, so their values can still
                    change.
                  </Trans>
                }
              />
            </div>
          ) : null}
        </div>
      </AppCardSection>
      <AppCardSection>
        {isLoading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Loader />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[250px] items-center justify-center text-typography-secondary">
            <Trans>No data available</Trans>
          </div>
        ) : (
          <div className="relative min-h-[250px] grow">
            <div className="absolute size-full">
              <ResponsiveContainer debounce={500}>
                <ComposedChart width={500} height={250} data={rows} barCategoryGap="25%" margin={CHART_MARGIN}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="5 3"
                    strokeWidth={0.5}
                    stroke="var(--color-slate-600)"
                  />
                  <RechartsTooltip
                    cursor={CHART_CURSOR_PROPS}
                    content={<VolumeChartTooltip networks={networks} />}
                    wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                  />
                  {networks.map((network) => (
                    <Bar
                      key={network}
                      dataKey={`values.${network}`}
                      stackId="volume"
                      fill={NETWORK_SERIES[network].fill}
                      isAnimationActive={false}
                    >
                      {renderProvisionalCells(rows)}
                    </Bar>
                  ))}
                  <XAxis
                    dataKey="dateCompact"
                    tickLine={false}
                    axisLine={X_AXIS_LINE_PROPS}
                    minTickGap={isMobile ? 8 : 32}
                    tick={CHART_TICK_PROPS}
                    tickMargin={10}
                  />
                  <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tickFormatter={usdYAxisTickFormatter}
                    tick={CHART_TICK_PROPS}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </AppCardSection>
    </AppCard>
  );
}

function renderProvisionalCells(rows: VolumeChartRow[]) {
  return rows.map((row) => <Cell key={row.day} fillOpacity={row.provisional ? PROVISIONAL_FILL_OPACITY : 1} />);
}

function VolumeChartTooltip({
  active,
  payload,
  networks,
}: TooltipProps<number, string> & { networks: ProtocolStatsNetwork[] }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const row = payload[0]!.payload as VolumeChartRow;
  const values = networks.map((network) => row.values[network] ?? null);

  return (
    <div className="text-body-small z-50 flex flex-col rounded-4 bg-slate-800 px-12 pt-8 shadow-lg backdrop-blur-sm">
      <StatsTooltipRow label={t`Date`} value={formatDate(row.day, { timezone: "utc" })} showDollar={false} />
      {networks.map((network, index) => (
        <StatsTooltipRow
          key={network}
          label={getProtocolStatsNetworkLabel(network)}
          value={formatProtocolStatsUsdNumber(values[index])}
          showDollar={false}
        />
      ))}
      <StatsTooltipRow
        label={t`Total`}
        value={formatProtocolStatsUsdNumber(sumProtocolStatsValues(values))}
        showDollar={false}
      />
      {row.provisional ? (
        <div className="pb-8 text-typography-secondary">
          <Trans>Provisional</Trans>
        </div>
      ) : null}
    </div>
  );
}
