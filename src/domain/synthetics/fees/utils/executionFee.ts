import { t } from "@lingui/macro";
import { getChainName, getHighExecutionFee } from "config/chains";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { applyFactor, expandDecimals } from "lib/numbers";
import { ExecutionFee, GasLimitsConfig } from "../types";

export function getExecutionFee(
  chainId: number,
  gasLimts: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: BigNumber,
  gasPrice: BigNumber
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken) return undefined;

  const baseGasLimit = gasLimts.estimatedFeeBaseGasLimit;
  const multiplierFactor = gasLimts.estimatedFeeMultiplierFactor;
  const adjustedGasLimit = baseGasLimit.add(applyFactor(estimatedGasLimit, multiplierFactor));

  const feeTokenAmount = adjustedGasLimit.mul(gasPrice);

  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

  const isFeeHigh = feeUsd.gt(expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS));

  const warning = isFeeHigh
    ? t`The network Fees are very high currently, which may be due to a temporary increase in transactions on the ${getChainName(
        chainId
      )} network.`
    : undefined;

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
    initialLongTokenAmount?: BigNumber;
    initialShortTokenAmount?: BigNumber;
    callbackGasLimit?: BigNumber;
  }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = (deposit.longTokenSwapsCount || 0) + (deposit.shortTokenSwapsCount || 0);

  const gasForSwaps = gasPerSwap.mul(swapsCount);
  const isMultiTokenDeposit = deposit.initialLongTokenAmount?.gt(0) && deposit.initialShortTokenAmount?.gt(0);

  const depositGasLimit = isMultiTokenDeposit ? gasLimits.depositMultiToken : gasLimits.depositSingleToken;

  return depositGasLimit.add(gasForSwaps).add(deposit.callbackGasLimit || 0);
}

export function estimateExecuteWithdrawalGasLimit(
  gasLimits: GasLimitsConfig,
  withdrawal: { callbackGasLimit?: BigNumber }
) {
  return gasLimits.withdrawalMultiToken.add(withdrawal.callbackGasLimit || 0);
}

export function estimateExecuteIncreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.increaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteDecreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.decreaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteSwapOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.swapOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}
