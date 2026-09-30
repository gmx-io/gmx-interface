import { Trans } from "@lingui/macro";
import cx from "classnames";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

export function LaunchBoostBadge({ className }: { className?: string }) {
  return (
    <TooltipWithPortal
      as="span"
      variant="none"
      className={cx(
        "inline-flex items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300",
        className
      )}
      content={
        <Trans>
          Extra yield for GLV [USDG] liquidity providers during the launch, targeting 8% or more on top of trading fees.
          Paid into the GLV price every 4 hours, so there's nothing to claim.
        </Trans>
      }
    >
      <img className="h-10" src={sparkleIcon} alt="" />
      <Trans>Launch boost</Trans>
    </TooltipWithPortal>
  );
}
