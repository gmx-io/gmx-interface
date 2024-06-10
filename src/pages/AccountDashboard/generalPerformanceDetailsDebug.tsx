import { gql } from "@apollo/client";
import { t } from "@lingui/macro";

import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { PnlSummaryPoint } from "./GeneralPerformanceDetails";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

export type PnlSummaryPointDebugFields = {
  // #region Debug fields
  // Present only when showDebugValues is true
  realizedBasePnlUsd: bigint;
  realizedFeesUsd: bigint;
  realizedPriceImpactUsd: bigint;
  unrealizedBasePnlUsd: bigint;
  unrealizedFeesUsd: bigint;
  startUnrealizedBasePnlUsd: bigint;
  startUnrealizedFeesUsd: bigint;
  // #endregion
};

export const DEBUG_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      realizedPnlUsd
      unrealizedPnlUsd
      startUnrealizedPnlUsd
      volume
      wins
      winsLossesRatioBps
      usedCapitalUsd

      realizedBasePnlUsd
      realizedFeesUsd
      realizedPriceImpactUsd
      unrealizedBasePnlUsd
      unrealizedFeesUsd
      startUnrealizedBasePnlUsd
      startUnrealizedFeesUsd
    }
  }
`;

export function GeneralPerformanceDetailsDebugTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <>
      <StatsTooltipRow
        label={t`Realized Base PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.realizedBasePnlUsd)}
        value={formatUsd(row.realizedBasePnlUsd)}
      />
      <StatsTooltipRow
        label={t`Unrealized Base PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.unrealizedBasePnlUsd)}
        value={formatUsd(row.unrealizedBasePnlUsd)}
      />
      <StatsTooltipRow
        label={t`Start Unrealized PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.startUnrealizedBasePnlUsd)}
        value={formatUsd(row.startUnrealizedBasePnlUsd)}
      />
      <br />
      <StatsTooltipRow
        label={t`Realized Fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.realizedFeesUsd)}
        value={formatUsd(-row.realizedFeesUsd)}
      />
      <StatsTooltipRow
        label={t`Unrealized Fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.unrealizedFeesUsd)}
        value={formatUsd(-row.unrealizedFeesUsd)}
      />
      <StatsTooltipRow
        label={t`Start Unrealized Fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.startUnrealizedFeesUsd)}
        value={formatUsd(-row.startUnrealizedFeesUsd)}
      />
      <br />
      <StatsTooltipRow
        label={t`Realized Price Impact`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.realizedPriceImpactUsd)}
        value={formatUsd(row.realizedPriceImpactUsd)}
      />
    </>
  );
}
