import { Trans, t } from "@lingui/macro";

import { PnlSummaryPoint } from "domain/synthetics/accountStats";
import { formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import {
  TooltipContent,
  TooltipDivider,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
} from "components/Tooltip/TooltipBlocks";

export function GeneralPerformanceDetailsDebugTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <TooltipContent>
      <TooltipRows>
        <TooltipRow
          label={t`Realized base PnL`}
          valueClassName={getPositiveOrNegativeClass(row.realizedBasePnlUsd)}
          value={formatUsd(row.realizedBasePnlUsd)}
        />
        <TooltipRow
          label={t`Unrealized base PnL`}
          valueClassName={getPositiveOrNegativeClass(row.unrealizedBasePnlUsd)}
          value={formatUsd(row.unrealizedBasePnlUsd)}
        />
        <TooltipRow
          label={t`Start unrealized PnL`}
          valueClassName={getPositiveOrNegativeClass(row.startUnrealizedBasePnlUsd)}
          value={formatUsd(row.startUnrealizedBasePnlUsd)}
        />
      </TooltipRows>
      <TooltipDivider />
      <TooltipRows>
        <TooltipRow
          label={t`Realized fees`}
          valueClassName={getPositiveOrNegativeClass(-row.realizedFeesUsd)}
          value={formatUsd(-row.realizedFeesUsd)}
        />
        <TooltipRow
          label={t`Realized swap fees`}
          valueClassName={getPositiveOrNegativeClass(-row.realizedSwapFeesUsd)}
          value={formatUsd(-row.realizedSwapFeesUsd)}
        />
        <TooltipRow
          label={t`Unrealized fees`}
          valueClassName={getPositiveOrNegativeClass(-row.unrealizedFeesUsd)}
          value={formatUsd(-row.unrealizedFeesUsd)}
        />
        <TooltipRow
          label={t`Start unrealized fees`}
          valueClassName={getPositiveOrNegativeClass(-row.startUnrealizedFeesUsd)}
          value={formatUsd(-row.startUnrealizedFeesUsd)}
        />
      </TooltipRows>
      <TooltipDivider />
      <TooltipRows>
        <TooltipRow
          label={t`Realized price impact`}
          valueClassName={getPositiveOrNegativeClass(row.realizedPriceImpactUsd)}
          value={formatUsd(row.realizedPriceImpactUsd)}
        />
        <TooltipRow
          label={t`Realized swap impact`}
          valueClassName={getPositiveOrNegativeClass(row.realizedSwapImpactUsd)}
          value={formatUsd(row.realizedSwapImpactUsd)}
        />
      </TooltipRows>
      <TooltipFootnote>
        <Trans>Outstanding claimable amounts are not included</Trans>
      </TooltipFootnote>
    </TooltipContent>
  );
}
