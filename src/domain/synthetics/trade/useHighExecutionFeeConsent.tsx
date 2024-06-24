import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { getExcessiveExecutionFee } from "config/chains";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useMemo, useState } from "react";

export function useHighExecutionFeeConsent(executionFeeUsd: bigint | undefined) {
  const [isHighExecutionFeeAccepted, setIsHighExecutionFeeAccepted] = useState(false);
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const shouldAccept = executionFeeUsd === undefined ? undefined : executionFeeUsd >= veryHighExecutionFeeUsd;

  return {
    isHighFeeConsentError: shouldAccept && !isHighExecutionFeeAccepted,
    element: shouldAccept ? (
      <div>
        <Checkbox asRow isChecked={isHighExecutionFeeAccepted} setIsChecked={setIsHighExecutionFeeAccepted}>
          <span className="text-14 text-yellow-500">
            <Trans>Acknowledge very high network Fees</Trans>
          </span>
        </Checkbox>
      </div>
    ) : null,
  };
}
