import { Trans, t } from "@lingui/macro";

import StandardTooltip, { type StandardTooltipVariant } from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";

export function PerformanceLabel({
  upperCase = false,
  short = true,
  variant = "underline",
}: {
  upperCase?: boolean;
  short?: boolean;
  variant?: StandardTooltipVariant;
}) {
  const label = short ? t`Annualized performance` : t`Annualized performance`;
  return (
    <StandardTooltip
      handle={upperCase ? label.toUpperCase() : label}
      className="normal-case"
      position="bottom-end"
      variant={variant}
      content={
        <TooltipContent>
          <TooltipText>
            <Trans>Projected yearly return vs. a Uniswap V2-style benchmark.</Trans>
          </TooltipText>
          <TooltipText>
            <Trans>Short timeframes may not reflect long-term performance.</Trans>
          </TooltipText>
          <TooltipLink href="https://dune.com/gmx-io/v2-lp-dashboard">
            <Trans>View detailed stats on Dune</Trans>
          </TooltipLink>
        </TooltipContent>
      }
    />
  );
}
