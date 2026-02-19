import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  bannerErrorContent,
  shouldShowAvalancheGmxAccountWarning,
  gasPaymentTokenWarningContent,
  isSubmitDisabled,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  bannerErrorContent?: ReactNode;
  shouldShowAvalancheGmxAccountWarning?: boolean;
  gasPaymentTokenWarningContent?: string;
  isSubmitDisabled?: boolean;
}) {
  const warnings: ReactNode[] = [];

  if (shouldShowAvalancheGmxAccountWarning) {
    warnings.push(
      <AlertInfoCard type="error" key="avalancheGmxAccountWarning" hideClose>
        <Trans>
          GMX Account support on Avalanche is ending. New positions and additional deposits are unavailable. Switch to
          Arbitrum as a settlement network.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForPosition) {
    warnings.push(
      <AlertInfoCard type="warning" key="swapBoxHighPriceImpactWarning" hideClose>
        <Trans>High price impact</Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForExecutionFee) {
    warnings.push(
      <AlertInfoCard type="warning" key="swapBoxHighNetworkFeeWarning" hideClose>
        <Trans>High network fees</Trans>
      </AlertInfoCard>
    );
  }

  if (bannerErrorContent) {
    warnings.push(
      <AlertInfoCard type="error" key="bannerErrorContent" hideClose>
        {bannerErrorContent}
      </AlertInfoCard>
    );
  }

  if (gasPaymentTokenWarningContent && !isSubmitDisabled && !bannerErrorContent) {
    warnings.push(
      <AlertInfoCard type="warning" key="gasPaymentTokenWarningContent" hideClose>
        {gasPaymentTokenWarningContent}
      </AlertInfoCard>
    );
  }

  if (!shouldShowWarning && warnings.length === 0) {
    return null;
  }

  return <div className="flex flex-col gap-14">{warnings}</div>;
}
