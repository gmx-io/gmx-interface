import { Trans, t } from "@lingui/macro";
import cx from "classnames";

import Badge from "components/Badge/Badge";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import sparkleIcon from "img/sparkle.svg";

export function LaunchBoostBadge({ className }: { className?: string }) {
  return (
    <StandardTooltip
      variant="none"
      className={cx("flex", className)}
      handle={
        <span className="inline-flex items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300">
          <img className="h-10" src={sparkleIcon} alt="" />
          <Trans>Launch boost</Trans>
        </span>
      }
      content={t`Extra yield for GLV [USDG] liquidity providers during the launch, targeting 8% or more on top of trading fees. Paid into the GLV price every 4 hours, so there's nothing to claim.`}
    />
  );
}

export function WhitelistOnlyBadge({
  className,
  isGlv,
  isSpotOnly,
}: {
  className?: string;
  isGlv: boolean;
  isSpotOnly: boolean | undefined;
}) {
  return (
    <StandardTooltip
      variant="none"
      className={cx("flex", className)}
      handle={
        <Badge>
          <Trans>Whitelist only</Trans>
        </Badge>
      }
      content={
        isGlv
          ? t`Only whitelisted addresses can deposit into this vault`
          : isSpotOnly
            ? t`Only GMX adds liquidity to this pool. It serves USDC and USDG swaps.`
            : t`Direct deposits into this pool are open to whitelisted addresses. GLV [USDG] gives you the same markets in one deposit.`
      }
    />
  );
}
