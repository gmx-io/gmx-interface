import { Trans, t } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StandardTooltip, { type StandardTooltipVariant } from "components/Tooltip/StandardTooltip";
import { TooltipText } from "components/Tooltip/TooltipBlocks";

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
        <TooltipText>
          <Trans>
            Projected yearly return vs. a Uniswap V2-style benchmark.
            <br />
            <br />
            Short timeframes may not reflect long-term performance.
            <br />
            <br />
            <ExternalLink href="https://dune.com/gmx-io/v2-lp-dashboard">View detailed stats on Dune</ExternalLink>.
          </Trans>
        </TooltipText>
      }
    />
  );
}
