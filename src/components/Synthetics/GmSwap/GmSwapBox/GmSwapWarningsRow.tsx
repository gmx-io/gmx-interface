import { Trans } from "@lingui/macro";
import noop from "lodash/noop";
import { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
}) {
  if (!shouldShowWarning) {
    return null;
  }

  const warnings: ReactNode[] = [];
  if (shouldShowWarningForPosition) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighPriceImpactWarning" onClose={noop}>
        <Trans>High Price Impact</Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForExecutionFee) {
    warnings.push(
      <AlertInfoCard className="mb-14" type="warning" key="swapBoxHighNetworkFeeWarning" onClose={noop}>
        <Trans>High Network Fees</Trans>
      </AlertInfoCard>
    );
  }

  return <div className="flex flex-col">{warnings}</div>;
}
