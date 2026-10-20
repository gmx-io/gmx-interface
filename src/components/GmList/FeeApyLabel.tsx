import { Trans, t } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StandardTooltip, { type StandardTooltipVariant } from "components/Tooltip/StandardTooltip";
import { TooltipText } from "components/Tooltip/TooltipBlocks";

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
        <TooltipText>
          <Trans>
            Projected yearly return from trading fees only.
            <br />
            <br />
            Includes: trading fees, borrow fees, liquidations, swaps.
            <br />
            Excludes: backing token price changes, PnL, funding fees.
            <br />
            <br />
            <ExternalLink href="https://dune.com/gmx-io/v2-lp-dashboard">View detailed stats on Dune</ExternalLink>.
          </Trans>
        </TooltipText>
      }
    />
  );
}
