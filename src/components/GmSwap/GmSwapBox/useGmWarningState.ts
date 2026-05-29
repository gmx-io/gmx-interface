import { getExcessiveExecutionFee } from "config/chains";
import { HIGH_PRICE_IMPACT_BPS, USD_DECIMALS } from "config/factors";
import { GmSwapFees } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function useGmWarningState({
  logicalFees: fees,
  isOperationDisabled,
}: {
  logicalFees: GmSwapFees | undefined;
  isOperationDisabled?: boolean;
}) {
  const { chainId } = useChainId();

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd ?? 0) < 0 &&
    bigMath.abs(fees?.swapPriceImpact?.bps ?? 0n) >= HIGH_PRICE_IMPACT_BPS;

  const isHighExecutionFee = Boolean(
    fees?.logicalNetworkFee?.deltaUsd !== undefined &&
      fees?.logicalNetworkFee?.deltaUsd >= expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS)
  );

  // When the operation is disabled (e.g. "Buying GM unavailable"), the user can't proceed,
  // so soft warnings would only add noise.
  const shouldShowWarningForExecutionFee = !isOperationDisabled && isHighExecutionFee;
  const shouldShowWarningForPosition = !isOperationDisabled && isHighPriceImpact;

  return {
    shouldShowWarning: shouldShowWarningForExecutionFee || shouldShowWarningForPosition,
    shouldShowWarningForExecutionFee,
    shouldShowWarningForPosition,
  };
}
