import { gql } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import { Area, Bar } from "recharts";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import type { AccountPnlHistoryPoint } from "./DailyAndCumulativePnL";

const DEBUG_BAR_SIZE = 3;
const DEBUG_AREA_STROKE_WIDTH = 1.5;

export function DebugTooltip({ stats }: { stats: AccountPnlHistoryPoint }) {
  const showDebugValues = useShowDebugValues();

  if (!showDebugValues) {
    return null;
  }

  return (
    <>
      <br />
      {[
        {
          label: (
            <span className="text-[#00ff00]">
              <Trans>Realized PnL</Trans>
            </span>
          ),
          value: stats.realizedPnl,
        },
        {
          label: (
            <span className="text-[#ff0000]">
              <Trans>Realized fees</Trans>
            </span>
          ),
          value: -stats.realizedFees,
        },
        {
          label: (
            <span className="text-[#ff00ff]">
              <Trans>Realized price impact</Trans>
            </span>
          ),
          value: stats.realizedPriceImpact,
        },
        {
          label: (
            <span className="text-[#ff00ff]">
              <Trans>Realized swap impact</Trans>
            </span>
          ),
          value: stats.realizedSwapImpact,
        },
        {
          label: (
            <span className="text-[#00ffff]">
              <Trans>Unrealized PnL</Trans>
            </span>
          ),
          value: stats.unrealizedPnl,
        },
        {
          label: (
            <span className="text-[#ff00ff]">
              <Trans>Unrealized fees</Trans>
            </span>
          ),
          value: -stats.unrealizedFees,
        },
        {
          label: (
            <span>
              <Trans>Start unrealized PnL</Trans>
            </span>
          ),
          value: stats.startUnrealizedPnl,
        },
        {
          label: (
            <span>
              <Trans>Start unrealized fees</Trans>
            </span>
          ),
          value: -stats.startUnrealizedFees,
        },
      ].map(({ label, value }, index) => (
        <StatsTooltipRow
          key={index}
          label={label}
          value={formatUsd(value)}
          showDollar={false}
          textClassName={getPositiveOrNegativeClass(value)}
        />
      ))}
    </>
  );
}

export function DebugLegend({ lastPoint }: { lastPoint?: AccountPnlHistoryPoint }) {
  const showDebugValues = useShowDebugValues();

  if (!showDebugValues) {
    return null;
  }

  if (!lastPoint) {
    return <div className="flex items-center gap-8 text-13 font-medium">{t`Debug values unavailable`}</div>;
  }

  return [
    {
      className: "bg-[#00ff00]",
      text: "Cumulative Realized PnL",
      value: lastPoint!.cumulativeRealizedPnl,
    },
    {
      className: "bg-[#ff0000]",
      text: "Cumulative Realized Fees",
      value: -lastPoint!.cumulativeRealizedFees,
    },
    {
      className: "bg-[#ff00ff]",
      text: "Cumulative Realized Price Impact",
      value: lastPoint!.cumulativeRealizedPriceImpact,
    },
    {
      className: "bg-[#ff00ff]",
      text: "Cumulative Realized Swap Impact",
      value: lastPoint!.cumulativeRealizedSwapImpact,
    },
    {
      className: "bg-[#00ffff]",
      text: "Last Unrealized PnL",
      value: lastPoint!.unrealizedPnl,
    },
    {
      className: "bg-[#ff00ff]",
      text: "Last Unrealized Fees",
      value: -lastPoint!.unrealizedFees,
    },
    {
      className: "bg-[#00ff00]",
      text: "Start Unrealized PnL",
      value: lastPoint!.startUnrealizedPnl,
    },
    {
      className: "bg-[#ff0000]",
      text: "Start Unrealized Fees",
      value: -lastPoint!.startUnrealizedFees,
    },
  ].map(({ className, text, value }) => (
    <div key={text} className="flex items-center gap-8 text-13 font-medium">
      <div className={`inline-block size-4 shrink-0 rounded-full ${className}`} />
      <span>
        {text} <span className={getPositiveOrNegativeClass(value)}>{formatUsd(value)}</span>
      </span>
    </div>
  ));
}

export const DEV_QUERY_WITH_TO = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int, $to: Int) {
    accountPnlHistoryStats(account: $account, from: $from, to: $to) {
      cumulativePnl
      cumulativeRealizedFees
      cumulativeRealizedPnl
      cumulativeRealizedPriceImpact
      cumulativeRealizedSwapImpact
      pnl
      realizedFees
      realizedPnl
      realizedPriceImpact
      realizedSwapImpact
      timestamp
      unrealizedFees
      unrealizedPnl
      startUnrealizedPnl
      startUnrealizedFees
    }
  }
`;

export const DEBUG_FIELDS = [
  "realizedFees",
  "realizedPnl",
  "realizedPriceImpact",
  "realizedSwapImpact",
  "cumulativeRealizedSwapImpact",
  "unrealizedFees",
  "unrealizedPnl",
  "cumulativeRealizedFees",
  "cumulativeRealizedPnl",
  "cumulativeRealizedPriceImpact",
  "startUnrealizedPnl",
  "startUnrealizedFees",
] as const;

export type AccountPnlHistoryPointDebugFields = {
  // #region Debug fields
  // Present only when showDebugValues is true
  realizedFees: bigint;
  realizedFeesFloat: number;
  realizedPnl: bigint;
  realizedPnlFloat: number;
  realizedPriceImpact: bigint;
  realizedPriceImpactFloat: number;
  realizedSwapImpact: bigint;
  realizedSwapImpactFloat: number;
  unrealizedFees: bigint;
  unrealizedFeesFloat: number;
  unrealizedPnl: bigint;
  unrealizedPnlFloat: number;
  cumulativeRealizedFees: bigint;
  cumulativeRealizedFeesFloat: number;
  cumulativeRealizedPnl: bigint;
  cumulativeRealizedPnlFloat: number;
  cumulativeRealizedPriceImpact: bigint;
  cumulativeRealizedPriceImpactFloat: number;
  cumulativeRealizedSwapImpact: bigint;
  cumulativeRealizedSwapImpactFloat: number;
  startUnrealizedPnl: bigint;
  startUnrealizedFeesFloat: number;
  startUnrealizedFees: bigint;
  startUnrealizedPnlFloat: number;
  // #endregion
};

function getDebugStackExtents(values: (number | undefined)[]) {
  let positiveValue = 0;
  let negativeValue = 0;
  let hasValue = false;

  for (const value of values) {
    if (value === undefined || !Number.isFinite(value)) {
      continue;
    }

    hasValue = true;

    if (value >= 0) {
      positiveValue += value;
    } else {
      negativeValue += value;
    }
  }

  return hasValue ? [positiveValue, negativeValue] : [];
}

function getNegativeDebugValue(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) ? undefined : -value;
}

export function getDebugPeriodPnlYAxisValues(point: AccountPnlHistoryPoint) {
  return [
    point.pnlFloat,
    ...getDebugStackExtents([
      point.realizedPnlFloat,
      getNegativeDebugValue(point.realizedFeesFloat),
      point.realizedPriceImpactFloat,
      point.unrealizedPnlFloat,
      getNegativeDebugValue(point.unrealizedFeesFloat),
    ]),
  ];
}

export function getDebugCumulativePnlYAxisValues(point: AccountPnlHistoryPoint) {
  return [
    point.cumulativePnlFloat,
    ...getDebugStackExtents([
      point.unrealizedPnlFloat,
      getNegativeDebugValue(point.unrealizedFeesFloat),
      point.cumulativeRealizedPnlFloat,
      getNegativeDebugValue(point.cumulativeRealizedFeesFloat),
      point.cumulativeRealizedPriceImpactFloat,
    ]),
  ];
}

export function renderDebugLines() {
  return (
    <>
      <Bar
        isAnimationActive={false}
        yAxisId="periodPnl"
        dataKey="realizedPnlFloat"
        stackId="dev"
        barSize={DEBUG_BAR_SIZE}
        minPointSize={1}
        fill="#00ff00"
      />
      <Bar
        isAnimationActive={false}
        yAxisId="periodPnl"
        dataKey={(entry) => getNegativeDebugValue(entry.realizedFeesFloat)}
        stackId="dev"
        barSize={DEBUG_BAR_SIZE}
        minPointSize={1}
        fill="#ff0000"
      />
      <Bar
        isAnimationActive={false}
        yAxisId="periodPnl"
        dataKey="realizedPriceImpactFloat"
        stackId="dev"
        barSize={DEBUG_BAR_SIZE}
        minPointSize={1}
        fill="#ff00ff"
      />
      <Bar
        isAnimationActive={false}
        yAxisId="periodPnl"
        dataKey="unrealizedPnlFloat"
        stackId="dev"
        barSize={DEBUG_BAR_SIZE}
        minPointSize={1}
        fill="#00ffff"
      />
      <Bar
        isAnimationActive={false}
        yAxisId="periodPnl"
        dataKey={(entry) => getNegativeDebugValue(entry.unrealizedFeesFloat)}
        stackId="dev"
        barSize={DEBUG_BAR_SIZE}
        minPointSize={1}
        fill="#ff00ff"
      />

      <Area
        isAnimationActive={false}
        xAxisId="cumulativePnlArea"
        yAxisId="cumulativePnl"
        type="monotone"
        dataKey="unrealizedPnlFloat"
        stackId="dev_cumulative"
        stroke="#00ffff"
        strokeWidth={DEBUG_AREA_STROKE_WIDTH}
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        isAnimationActive={false}
        xAxisId="cumulativePnlArea"
        yAxisId="cumulativePnl"
        type="monotone"
        dataKey={(entry) => getNegativeDebugValue(entry.unrealizedFeesFloat)}
        stackId="dev_cumulative"
        stroke="#ff00ff"
        strokeWidth={DEBUG_AREA_STROKE_WIDTH}
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        isAnimationActive={false}
        xAxisId="cumulativePnlArea"
        yAxisId="cumulativePnl"
        type="monotone"
        dataKey="cumulativeRealizedPnlFloat"
        stackId="dev_cumulative"
        stroke="#00ff00"
        strokeWidth={DEBUG_AREA_STROKE_WIDTH}
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        isAnimationActive={false}
        xAxisId="cumulativePnlArea"
        yAxisId="cumulativePnl"
        type="monotone"
        dataKey={(entry) => getNegativeDebugValue(entry.cumulativeRealizedFeesFloat)}
        stackId="dev_cumulative"
        stroke="#ff0000"
        strokeWidth={DEBUG_AREA_STROKE_WIDTH}
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        isAnimationActive={false}
        xAxisId="cumulativePnlArea"
        yAxisId="cumulativePnl"
        type="monotone"
        dataKey="cumulativeRealizedPriceImpactFloat"
        stackId="dev_cumulative"
        stroke="#ff00ff"
        strokeWidth={DEBUG_AREA_STROKE_WIDTH}
        fill="transparent"
        strokeDasharray={"5 5"}
      />
    </>
  );
}
