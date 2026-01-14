import { Trans } from "@lingui/macro";
import noop from "lodash/noop";
import { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  insufficientGasWarningText,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  insufficientGasWarningText?: string;
}) {
  const warnings: ReactNode[] = [];

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
