import { Trans, t } from "@lingui/macro";

import StandardTooltip, { type StandardTooltipVariant } from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";

export function FeeApyLabel({
  upperCase = false,
  variant = "underline",
}: {
  upperCase?: boolean;
  variant?: StandardTooltipVariant;
}) {
  const label = t`Fee APY`;
  return (
    <StandardTooltip
      handle={upperCase ? label.toUpperCase() : label}
      className="normal-case"
      position="bottom-end"
      variant={variant}
      content={
        <TooltipContent>
          <TooltipText>
            <Trans>Projected yearly return from trading fees only.</Trans>
          </TooltipText>
          <TooltipTitledText title={<Trans>Includes</Trans>}>
            <Trans>Trading fees, borrow fees, liquidations, swaps.</Trans>
          </TooltipTitledText>
          <TooltipTitledText title={<Trans>Excludes</Trans>}>
            <Trans>Backing token price changes, PnL, funding fees.</Trans>
          </TooltipTitledText>
          <TooltipLink href="https://dune.com/gmx-io/v2-lp-dashboard">
            <Trans>View detailed stats on Dune</Trans>
          </TooltipLink>
        </TooltipContent>
      }
    />
  );
}
