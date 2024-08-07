import { t } from "@lingui/macro";

import { PnlSummaryPoint } from "domain/synthetics/accountStats/usePnlSummaryData";
import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

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
