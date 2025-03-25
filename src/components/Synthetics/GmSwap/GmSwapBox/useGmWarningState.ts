import { useEffect, useState } from "react";
import { usePrevious } from "react-use";

import { getExcessiveExecutionFee } from "config/chains";
import { HIGH_PRICE_IMPACT_BPS, USD_DECIMALS } from "config/factors";
import { ExecutionFee } from "domain/synthetics/fees";
import { GmSwapFees } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function useGmWarningState({
  executionFee,
  fees,
}: {
  executionFee: ExecutionFee | undefined;
  fees: GmSwapFees | undefined;
}) {
  const { chainId } = useChainId();
  const [isAccepted, setIsAccepted] = useState(false);

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd ?? 0) < 0 &&
    bigMath.abs(fees?.swapPriceImpact?.bps ?? 0n) >= HIGH_PRICE_IMPACT_BPS;

  const prevIsHighPriceImpact = usePrevious(isHighPriceImpact);

  const isHighExecutionFee = Boolean(
    executionFee && executionFee?.feeUsd >= expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS)
  );

  const prevIsHighExecutionFeeUsd = usePrevious(isHighExecutionFee);

  useEffect(() => {
    if (prevIsHighPriceImpact === undefined || prevIsHighPriceImpact === isHighPriceImpact) {
      return;
    }

    if (prevIsHighExecutionFeeUsd !== isHighExecutionFee || prevIsHighPriceImpact !== isHighPriceImpact) {
      setIsAccepted(false);
    }
  }, [isHighExecutionFee, isHighPriceImpact, prevIsHighExecutionFeeUsd, prevIsHighPriceImpact, setIsAccepted]);

  const consentError = (isHighExecutionFee || isHighPriceImpact) && !isAccepted;
  const shouldShowWarning = isHighExecutionFee || isHighPriceImpact;

  return {
    isAccepted,
    setIsAccepted,
    consentError,
    shouldShowWarning,
    shouldShowWarningForExecutionFee: isHighExecutionFee,
    shouldShowWarningForPosition: isHighPriceImpact,
  };
}
