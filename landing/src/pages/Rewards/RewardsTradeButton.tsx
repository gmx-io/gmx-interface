import { Trans } from "@lingui/macro";
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
    <button className={`rewards-button ${className}`} onClick={goToTrade}>
      <Trans>Start Trading</Trans>
    </button>
  );
}
