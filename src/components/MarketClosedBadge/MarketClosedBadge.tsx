import { Trans, t } from "@lingui/macro";
import cx from "classnames";

import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipRow, TooltipText, TooltipTitle } from "components/Tooltip/TooltipBlocks";

type Props = {
  poolName?: string;
  variant?: "badge" | "text";
  className?: string;
};

export function MarketClosedBadge({ poolName, variant = "badge", className }: Props) {
  return (
    <StandardTooltip
      className={cx("shrink-0", { flex: variant === "text" }, className)}
      handleClassName={cx("whitespace-nowrap text-12 font-medium text-yellow-300", {
        "rounded-4 bg-yellow-300/20 px-5 py-1 leading-[15px]": variant === "badge",
        "leading-base after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:border-b after:border-dotted after:border-yellow-300/50 after:content-['']":
          variant === "text",
      })}
      contentClassName="gap-4"
      variant="iconStroke"
      iconClassName="!size-12"
      shouldStopPropagation
      content={
        <TooltipContent>
          <TooltipTitle>
            <Trans>Market closed</Trans>
          </TooltipTitle>
          <TooltipText>
            <Trans>
              This market is temporarily closed, for example while its price feed is unavailable. You can't open or
              increase a position until it reopens.
            </Trans>
          </TooltipText>
          {poolName && <TooltipRow label={t`Pool`} value={poolName} />}
        </TooltipContent>
      }
    >
      <Trans context="Market state">Closed</Trans>
    </StandardTooltip>
  );
}
