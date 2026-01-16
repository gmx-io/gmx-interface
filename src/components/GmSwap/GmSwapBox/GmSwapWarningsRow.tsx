import { Trans } from "@lingui/macro";
import noop from "lodash/noop";
import { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  insufficientGasWarningText,
  shouldShowAvalancheGmxAccountWarning,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  insufficientGasWarningText?: string;
  shouldShowAvalancheGmxAccountWarning?: boolean;
}) {
  const warnings: ReactNode[] = [];

  if (shouldShowAvalancheGmxAccountWarning) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="error" key="avalancheGmxAccountWarning" hideClose>
        <Trans>
          Support for GMX accounts on Avalanche will be discontinued soon. Opening new positions from and depositing
          additional funds to Avalanche GMX accounts is no longer available. We recommend switching to Arbitrum as a
          settlement network.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForPosition) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighPriceImpactWarning" onClose={noop}>
        <Trans>High price impact</Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForExecutionFee) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighNetworkFeeWarning" onClose={noop}>
        <Trans>High network fees</Trans>
      </AlertInfoCard>
    );
  }

  if (insufficientGasWarningText) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="info" key="swapBoxInsufficientGasWarning" hideClose>
        {insufficientGasWarningText}
      </AlertInfoCard>
    );
  }

  if (!shouldShowWarning && warnings.length === 0) {
    return null;
  }

  return <div className="flex flex-col">{warnings}</div>;
}
