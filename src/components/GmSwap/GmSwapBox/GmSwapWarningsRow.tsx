import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  bannerErrorContent,
  shouldShowAvalancheGmxAccountWarning,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  bannerErrorContent?: ReactNode;
  shouldShowAvalancheGmxAccountWarning?: boolean;
}) {
  const warnings: ReactNode[] = [];

  if (shouldShowAvalancheGmxAccountWarning) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="error" key="avalancheGmxAccountWarning" hideClose>
        <Trans>
          GMX Account support on Avalanche is ending. New positions and additional deposits are unavailable. Switch to
          Arbitrum as a settlement network.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForPosition) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighPriceImpactWarning" hideClose>
        <Trans>High price impact</Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForExecutionFee) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighNetworkFeeWarning" hideClose>
        <Trans>High network fees</Trans>
      </AlertInfoCard>
    );
  }

  if (bannerErrorContent) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="error" key="bannerErrorContent" hideClose>
        {bannerErrorContent}
      </AlertInfoCard>
    );
  }

  if (!shouldShowWarning && warnings.length === 0) {
    return null;
  }

  return <div className="flex flex-col">{warnings}</div>;
}
