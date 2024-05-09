import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { getExcessiveExecutionFee } from "config/chains";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useMemo, useState } from "react";

export function useHighExecutionFeeConsent(executionFeeUsd: BigNumber | undefined) {
  const [isHighExecutionFeeAccepted, setIsHighExecutionFeeAccepted] = useState(false);
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const shouldAccept = executionFeeUsd?.gte(veryHighExecutionFeeUsd);

  return {
    isHighFeeConsentError: shouldAccept && !isHighExecutionFeeAccepted,
    element: shouldAccept ? (
      <div>
        <Checkbox asRow isChecked={isHighExecutionFeeAccepted} setIsChecked={setIsHighExecutionFeeAccepted}>
          <span className="text-yellow-500 text-14">
            <Trans>Acknowledge very high network Fees</Trans>
          </span>
        </Checkbox>
      </div>
    ) : null,
  };
}
