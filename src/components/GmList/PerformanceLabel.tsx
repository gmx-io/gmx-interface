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
  const label = short ? t`Ann. Performance` : t`Annualized Performance`;
  return (
    <TooltipWithPortal
      handle={upperCase ? label.toUpperCase() : label}
      className="normal-case"
      position="bottom-end"
      variant={variant}
      content={
        <Trans>
          Annualized return of the pool or vault over the selected period, compared to a benchmark that follows Uniswap
          V2–style rebalancing of the backing tokens in the same GM pool or GLV vault.
          <br />
          <br />
          Annualized figures based on short periods may be distorted by short-term volatility.
          <br />
          <br />
          For detailed stats and comparisons, see the{" "}
          <ExternalLink href="https://dune.com/gmx-io/v2-lp-dashboard">GMX V2 LP Dashboard</ExternalLink>.
        </Trans>
      }
    />
  );
}
