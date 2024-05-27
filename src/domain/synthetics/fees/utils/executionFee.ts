import { t } from "@lingui/macro";
import { getChainName, getHighExecutionFee, getExcessiveExecutionFee } from "config/chains";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { applyFactor, expandDecimals } from "lib/numbers";
import { ExecutionFee, GasLimitsConfig } from "../types";

export function getExecutionFee(
  chainId: number,
  gasLimts: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: bigint,
  gasPrice: bigint
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken) return undefined;

  const baseGasLimit = gasLimts.estimatedFeeBaseGasLimit;
  const multiplierFactor = gasLimts.estimatedFeeMultiplierFactor;
  const adjustedGasLimit = baseGasLimit + applyFactor(estimatedGasLimit, multiplierFactor);

  const feeTokenAmount = adjustedGasLimit * gasPrice;

  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

  const isFeeHigh = feeUsd > expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS);
  const isFeeVeryHigh = feeUsd > expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS);

  const chainName = getChainName(chainId);
  const highWarning = t`The network fees are high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;
  const veryHighWarning = t`The network fees are very high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;

  const warning = isFeeVeryHigh ? veryHighWarning : isFeeHigh ? highWarning : undefined;

  return {
    feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
    warning,
  };
}

export function estimateExecuteDepositGasLimit(
  gasLimits: GasLimitsConfig,
  deposit: {
    longTokenSwapsCount?: number;
    shortTokenSwapsCount?: number;
    initialLongTokenAmount?: bigint;
    initialShortTokenAmount?: bigint;
    callbackGasLimit?: bigint;
  }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = (deposit.longTokenSwapsCount || 0) + (deposit.shortTokenSwapsCount || 0);

  const gasForSwaps = gasPerSwap * BigInt(swapsCount);
  const isMultiTokenDeposit =
    deposit.initialLongTokenAmount !== undefined &&
    deposit.initialShortTokenAmount !== undefined &&
    deposit.initialLongTokenAmount > 0 &&
    deposit.initialShortTokenAmount > 0;

  const depositGasLimit = isMultiTokenDeposit ? gasLimits.depositMultiToken : gasLimits.depositSingleToken;

  return depositGasLimit + gasForSwaps + (deposit.callbackGasLimit ?? 0n);
}

export function estimateExecuteWithdrawalGasLimit(
  gasLimits: GasLimitsConfig,
  withdrawal: { callbackGasLimit?: bigint }
) {
  return gasLimits.withdrawalMultiToken + (withdrawal.callbackGasLimit ?? 0n);
}

export function estimateExecuteIncreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: bigint }
) {
  return (
    gasLimits.increaseOrder +
    gasLimits.singleSwap * (BigInt(order.swapsCount ?? 0) ?? 0n) +
    (order.callbackGasLimit ?? 0n)
  );
}

export function estimateExecuteDecreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: bigint }
) {
  return (
    gasLimits.decreaseOrder +
    gasLimits.singleSwap * (BigInt(order.swapsCount ?? 0) ?? 0n) +
    (order.callbackGasLimit ?? 0n)
  );
}

export function estimateExecuteSwapOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: bigint }
) {
  return gasLimits.swapOrder + gasLimits.singleSwap * BigInt(order.swapsCount ?? 0n) + (order.callbackGasLimit ?? 0n);
}
