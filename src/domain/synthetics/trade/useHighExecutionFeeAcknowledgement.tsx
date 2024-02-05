import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { getVeryHighExecutionFee } from "config/chains";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useMemo, useState } from "react";

export function useHighExecutionFeeAcknowledgement(executionFeeUsd: BigNumber | undefined) {
  const [isHighExecutionFeeAccepted, setIsHighExecutionFeeAccepted] = useState(false);
  const { chainId } = useChainId();
  const veryHighExecutionFeeUsd = useMemo(
    () => expandDecimals(getVeryHighExecutionFee(chainId), USD_DECIMALS),
    [chainId]
  );
  const shouldAccept = executionFeeUsd?.gte(veryHighExecutionFeeUsd);

  return {
    highExecutionFeeNotAcceptedError: shouldAccept && !isHighExecutionFeeAccepted,
    element: shouldAccept ? (
      <div>
        <Checkbox asRow isChecked={isHighExecutionFeeAccepted} setIsChecked={setIsHighExecutionFeeAccepted}>
          <span className="text-warning font-sm">
            <Trans>Acknowledge very high network Fees</Trans>
          </span>
        </Checkbox>
      </div>
    ) : null,
  };
}
