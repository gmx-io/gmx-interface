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

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd ?? 0) < 0 &&
    bigMath.abs(fees?.swapPriceImpact?.bps ?? 0n) >= HIGH_PRICE_IMPACT_BPS;

  const isHighExecutionFee = Boolean(
    executionFee && executionFee?.feeUsd >= expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS)
  );

  const shouldShowWarning = isHighExecutionFee || isHighPriceImpact;

  return {
    shouldShowWarning,
    shouldShowWarningForExecutionFee: isHighExecutionFee,
    shouldShowWarningForPosition: isHighPriceImpact,
  };
}
