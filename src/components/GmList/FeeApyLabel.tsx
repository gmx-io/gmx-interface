import { Trans, t } from "@lingui/macro";
import { ComponentProps } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function FeeApyLabel({
  upperCase = false,
  variant = "underline",
}: {
  upperCase?: boolean;
  variant?: ComponentProps<typeof TooltipWithPortal>["variant"];
}) {
  const label = t`Fee APY`;
  return (
    <TooltipWithPortal
      handle={upperCase ? label.toUpperCase() : label}
      className="normal-case"
      position="bottom-end"
      variant={variant}
      content={
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
      }
    />
  );
}
