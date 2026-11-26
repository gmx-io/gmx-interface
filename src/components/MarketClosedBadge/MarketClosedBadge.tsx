import { Trans, t } from "@lingui/macro";
import cx from "classnames";

import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipRow, TooltipText, TooltipTitle } from "components/Tooltip/TooltipBlocks";

type Props = {
  poolName?: string;
  label?: "closed" | "marketClosed";
  isTruncatable?: boolean;
  className?: string;
};

export function MarketClosedBadge({ poolName, label = "closed", isTruncatable = false, className }: Props) {
  return (
    <StandardTooltip
      className={cx(isTruncatable ? "min-w-0 max-w-full" : "shrink-0", className)}
      handleClassName={cx(
        "whitespace-nowrap rounded-full bg-yellow-300/20 px-6 py-[1.5px] text-12 font-medium leading-[1.25] text-yellow-300",
        { "max-w-full": isTruncatable }
      )}
      contentClassName={cx("gap-4", { "min-w-0": isTruncatable })}
      variant="iconStroke"
      iconClassName="!size-12"
      shouldStopPropagation="touch"
      shouldPreventDefault={false}
      content={
        <TooltipContent>
          <TooltipTitle>
            <Trans>Market closed</Trans>
          </TooltipTitle>
          <TooltipText>
            <Trans>
              Limit, Stop Market and TP/SL orders can still be created, but execute only after the market reopens.
            </Trans>
          </TooltipText>
          <TooltipText>
            <Trans>Market orders, TWAP, Close, withdrawals and "Now" deposits are unavailable until then.</Trans>
          </TooltipText>
          {poolName && <TooltipRow label={t`Pool`} value={poolName} />}
        </TooltipContent>
      }
    >
      <span className={cx({ truncate: isTruncatable })}>
        {label === "marketClosed" ? <Trans>Market closed</Trans> : <Trans context="Market state">Closed</Trans>}
      </span>
    </StandardTooltip>
  );
}
