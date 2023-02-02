import { t } from "@lingui/macro";
import { getExecutionFeeMultiplier, getHighExecutionFee } from "config/chains";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { convertToTokenAmount, convertToUsd, getTokenData, TokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { applyFactor, expandDecimals, getBasisPoints } from "lib/numbers";
import { ExecutionFee, ExecutionFeeParams, FeeItem, GasLimitsConfig, MarketsFeesConfigsData } from "../types";

export * from "./priceImpact";
export * from "./swapFees";

export function getMarketFeesConfig(feeConfigsData: MarketsFeesConfigsData, marketAddress?: string) {
  if (!marketAddress) return undefined;

  return feeConfigsData[marketAddress];
}

export function getPositionFee(
  feeConfigs: MarketsFeesConfigsData,
  marketAddress?: string,
  sizeDeltaUsd?: BigNumber,
  collateralUsd?: BigNumber
): FeeItem | undefined {
  const feeConfig = getMarketFeesConfig(feeConfigs, marketAddress);

  if (!feeConfig || !sizeDeltaUsd) return undefined;

  const feeUsd = applyFactor(sizeDeltaUsd, feeConfig.positionFeeFactor);
  const bps = collateralUsd?.gt(0) ? getBasisPoints(feeUsd, collateralUsd) : BigNumber.from(0);

  return {
    deltaUsd: feeUsd.mul(-1),
    bps,
  };
}

export function getTotalFeeItem(feeItems: FeeItem[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BigNumber.from(0),
    bps: BigNumber.from(0),
  };

  feeItems.forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps.add(feeItem.bps);
  });

  return totalFeeItem;
}

export function getExecutionFee(tokensData: TokensData): ExecutionFeeParams | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken?.prices) return undefined;

  const feeUsd = expandDecimals(2, 28);
  const feeTokenAmount = convertToTokenAmount(feeUsd, nativeToken.decimals, nativeToken.prices.maxPrice);

  return {
    feeUsd: feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
  };
}

export function getMinExecutionFee(
  chainId: number,
  gasLimts: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: BigNumber,
  gasPrice: BigNumber
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken?.prices) return undefined;

  const baseGasLimit = gasLimts.estimatedFeeBaseGasLimit;
  const multiplierFactor = gasLimts.estimatedFeeMultiplierFactor;
  const adjustedGasLimit = baseGasLimit.add(applyFactor(estimatedGasLimit, multiplierFactor));

  let feeTokenAmount = adjustedGasLimit.mul(gasPrice);

  const multiplier = getExecutionFeeMultiplier(chainId);
  const baseChainExecutionFee = gasPrice.mul(multiplier);

  if (baseChainExecutionFee.gt(feeTokenAmount)) {
    feeTokenAmount = baseChainExecutionFee;
  }

  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

  const isFeeHigh = feeUsd.gt(expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS));

  const warning = isFeeHigh
    ? t`The network cost to send transactions is high at the moment, please check the "Execution Fee" value before proceeding.`
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
    longTokenSwapPath?: string[];
    shortTokenSwapPath?: string[];
    initialLongTokenAmount?: BigNumber;
    initialShortTokenAmount?: BigNumber;
    callbackGasLimit?: BigNumber;
  }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = (deposit.longTokenSwapPath?.length || 0) + (deposit.shortTokenSwapPath?.length || 0);

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
  order: { swapPath?: string[]; callbackGasLimit?: BigNumber }
) {
  const swapsCount = order.swapPath?.length || 0;

  return gasLimits.increaseOrder.add(gasLimits.singleSwap.mul(swapsCount)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteDecreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapPath?: string[]; callbackGasLimit?: BigNumber }
) {
  const swapsCount = order.swapPath?.length || 0;

  return gasLimits.decreaseOrder.add(gasLimits.singleSwap.mul(swapsCount)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteSwapOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapPath?: string[]; callbackGasLimit?: BigNumber }
) {
  const swapsCount = order.swapPath?.length || 0;

  return gasLimits.swapOrder.add(gasLimits.singleSwap.mul(swapsCount)).add(order.callbackGasLimit || 0);
}
