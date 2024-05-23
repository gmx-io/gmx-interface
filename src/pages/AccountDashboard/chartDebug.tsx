import { gql } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import { Area, Bar } from "recharts";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import type { AccountPnlHistoryPoint } from "./DailyAndCumulativePnL";

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
              <Trans>Realized Fees</Trans>
            </span>
          ),
          value: -stats.realizedFees,
        },
        {
          label: (
            <span className="text-[#ff00ff]">
              <Trans>Realized Price Impact</Trans>
            </span>
          ),
          value: stats.realizedPriceImpact,
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
              <Trans>Unrealized Fees</Trans>
            </span>
          ),
          value: -stats.unrealizedFees,
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
    return t`Debug values are not available`;
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
      className: "bg-[#00ffff]",
      text: "Last Unrealized PnL",
      value: lastPoint!.unrealizedPnl,
    },
    {
      className: "bg-[#ff00ff]",
      text: "Last Unrealized Fees",
      value: -lastPoint!.unrealizedFees,
    },
  ].map(({ className, text, value }) => (
    <div key={text}>
      <div className={`inline-block size-10 rounded-full ${className}`} /> {text} {formatUsd(value)}
    </div>
  ));
}

export const DEV_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int) {
    accountPnlHistoryStats(account: $account, from: $from) {
      cumulativePnl
      cumulativeRealizedFees
      cumulativeRealizedPnl
      cumulativeRealizedPriceImpact
      pnl
      realizedFees
      realizedPnl
      realizedPriceImpact
      timestamp
      unrealizedFees
      unrealizedPnl
    }
  }
`;

export const DEBUG_FIELDS = [
  "realizedFees",
  "realizedPnl",
  "realizedPriceImpact",
  "unrealizedFees",
  "unrealizedPnl",
  "cumulativeRealizedFees",
  "cumulativeRealizedPnl",
  "cumulativeRealizedPriceImpact",
];

export type AccountPnlHistoryPointDebugFields = {
  // #region Debug fields
  // Present only when showDebugValues is true
  realizedFees: bigint;
  realizedFeesFloat: number;
  realizedPnl: bigint;
  realizedPnlFloat: number;
  realizedPriceImpact: bigint;
  realizedPriceImpactFloat: number;
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
};

export function DebugLines() {
  const showDebugValues = useShowDebugValues();

  if (!showDebugValues) {
    return null;
  }

  return (
    <>
      <Bar dataKey="realizedPnlFloat" stackId="dev" minPointSize={1} fill="#00ff00" />
      <Bar dataKey={(entry) => -entry.realizedFeesFloat} stackId="dev" minPointSize={1} fill="#ff0000" />
      <Bar dataKey="realizedPriceImpactFloat" stackId="dev" minPointSize={1} fill="#ff00ff" />
      <Bar dataKey="unrealizedPnlFloat" stackId="dev" minPointSize={1} fill="#00ffff" />
      <Bar dataKey={(entry) => -entry.unrealizedFeesFloat} stackId="dev" minPointSize={1} fill="#ff00ff" />

      <Area
        type="monotone"
        dataKey="cumulativeUnrealizedPnlFloat"
        stackId="dev_cumulative"
        stroke="#00ffff"
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        type="monotone"
        dataKey={(entry) => -entry.cumulativeUnrealizedFeesFloat}
        stackId="dev_cumulative"
        stroke="#ff00ff"
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        type="monotone"
        dataKey="cumulativeRealizedPnlFloat"
        stackId="dev_cumulative"
        stroke="#00ff00"
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        type="monotone"
        dataKey={(entry) => -entry.cumulativeRealizedFeesFloat}
        stackId="dev_cumulative"
        stroke="#ff0000"
        fill="transparent"
        strokeDasharray={"5 5"}
      />
      <Area
        type="monotone"
        dataKey="cumulativeRealizedPriceImpactFloat"
        stackId="dev_cumulative"
        stroke="#ff00ff"
        fill="transparent"
        strokeDasharray={"5 5"}
      />
    </>
  );
}
