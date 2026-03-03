import { t } from "@lingui/macro";

import { PnlSummaryPoint } from "domain/synthetics/accountStats";
import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

export function GeneralPerformanceDetailsDebugTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <>
      <StatsTooltipRow
        label={t`Realized base PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.realizedBasePnlUsd)}
        value={formatUsd(row.realizedBasePnlUsd)}
      />
      <StatsTooltipRow
        label={t`Unrealized base PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.unrealizedBasePnlUsd)}
        value={formatUsd(row.unrealizedBasePnlUsd)}
      />
      <StatsTooltipRow
        label={t`Start unrealized PnL`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.startUnrealizedBasePnlUsd)}
        value={formatUsd(row.startUnrealizedBasePnlUsd)}
      />
      <br />
      <StatsTooltipRow
        label={t`Realized fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.realizedFeesUsd)}
        value={formatUsd(-row.realizedFeesUsd)}
      />
      <StatsTooltipRow
        label={t`Unrealized fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.unrealizedFeesUsd)}
        value={formatUsd(-row.unrealizedFeesUsd)}
      />
      <StatsTooltipRow
        label={t`Start unrealized fees`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(-row.startUnrealizedFeesUsd)}
        value={formatUsd(-row.startUnrealizedFeesUsd)}
      />
      <br />
      <StatsTooltipRow
        label={t`Realized price impact`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.realizedPriceImpactUsd)}
        value={formatUsd(row.realizedPriceImpactUsd)}
      />
      <StatsTooltipRow
        label={t`Realized swap impact`}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(row.realizedSwapImpactUsd)}
        value={formatUsd(row.realizedSwapImpactUsd)}
      />
    </>
  );
}
