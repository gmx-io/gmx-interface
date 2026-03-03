import { Trans, t } from "@lingui/macro";
import { ComponentProps } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function PerformanceLabel({
  upperCase = false,
  short = true,
  variant = "underline",
}: {
  upperCase?: boolean;
  short?: boolean;
  variant?: ComponentProps<typeof TooltipWithPortal>["variant"];
}) {
  const label = short ? t`Ann. performance` : t`Annualized performance`;
  return (
    <TooltipWithPortal
      handle={upperCase ? label.toUpperCase() : label}
      className="normal-case"
      position="bottom-end"
      variant={variant}
      content={
        <Trans>
          Projected yearly return vs. a Uniswap V2-style benchmark.
          <br />
          <br />
          Note: Short timeframes may not reflect long-term performance.
          <br />
          <br />
          <ExternalLink href="https://dune.com/gmx-io/v2-lp-dashboard">View detailed stats on Dune</ExternalLink>.
        </Trans>
      }
    />
  );
}
