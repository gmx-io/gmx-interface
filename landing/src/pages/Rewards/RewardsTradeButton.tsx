import { Trans } from "@lingui/macro";
import cx from "classnames";
import { RedirectChainIds, useGoToTrade } from "landing/pages/Home/hooks/useGoToTrade";

import type { RewardsLandingPlacement } from "lib/userAnalytics/rewardsLandingEvents";

export function RewardsTradeButton({
  className = "",
  placement,
}: {
  className?: string;
  placement: RewardsLandingPlacement;
}) {
  const goToTrade = useGoToTrade({
    chainId: RedirectChainIds.Arbitum,
    buttonPosition: "MenuButton",
    rewardsPlacement: placement,
  });

  return (
    <button
      className={cx(
        "rewards-button inline-flex min-h-44 items-center justify-center gap-8 rounded-8 px-20 py-14 text-center text-16 font-medium leading-[24px]",
        "tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
        "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]",
        className
      )}
      onClick={goToTrade}
    >
      <Trans>Start Trading</Trans>
    </button>
  );
}
