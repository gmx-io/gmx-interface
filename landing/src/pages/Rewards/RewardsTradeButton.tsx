import { Trans } from "@lingui/macro";
import { RedirectChainIds, useGoToTrade } from "landing/pages/Home/hooks/useGoToTrade";

export function RewardsTradeButton({ className = "" }: { className?: string }) {
  const goToTrade = useGoToTrade({ chainId: RedirectChainIds.Arbitum, buttonPosition: "MenuButton" });

  return (
    <button className={`rewards-button ${className}`} onClick={goToTrade}>
      <Trans>Start Trading</Trans>
    </button>
  );
}
