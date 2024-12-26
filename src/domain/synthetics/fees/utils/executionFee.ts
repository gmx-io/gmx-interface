import { t } from "@lingui/macro";
import { getChainName, getExcessiveExecutionFee, getHighExecutionFee } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { convertToUsd, getTokenData, TokensData } from "domain/synthetics/tokens";
import { applyFactor, expandDecimals } from "lib/numbers";
import { ExecutionFee, GasLimitsConfig } from "../types";
import { bigMath } from "lib/bigmath";

export function estimateExecutionGasPrice(p: {
  rawGasPrice: bigint | undefined;
  maxPriorityFeePerGas: bigint | undefined;
  bufferBps: bigint | number | undefined;
  premium: bigint | undefined;
}) {
  let { rawGasPrice = 0n, maxPriorityFeePerGas = 0n, bufferBps = 0n, premium = 0n } = p;

  let gasPrice = rawGasPrice + maxPriorityFeePerGas;

  const buffer = bigMath.mulDiv(gasPrice, BigInt(bufferBps ?? 0), BASIS_POINTS_DIVISOR_BIGINT);

  gasPrice = gasPrice + buffer;
  gasPrice = gasPrice + premium;

  return gasPrice + premium;
}

export function getMinimumExecutionFeeBufferBps(p: {
  minExecutionFee: bigint;
  estimatedExecutionFee: bigint;
  currentBufferBps: bigint;
  premium: bigint;
  gasLimit: bigint;
}) {
  const { minExecutionFee, estimatedExecutionFee, currentBufferBps, premium, gasLimit } = p;

  const estimatedGasPriceWithBuffer = estimatedExecutionFee / gasLimit - premium;

  const baseGasPrice =
    (estimatedGasPriceWithBuffer * BASIS_POINTS_DIVISOR_BIGINT) / (BASIS_POINTS_DIVISOR_BIGINT + currentBufferBps);

  // Calculate target gas price (without premium)
  const targetGasPrice = minExecutionFee / gasLimit - premium;
  const bufferBps = (targetGasPrice * BASIS_POINTS_DIVISOR_BIGINT) / baseGasPrice - BASIS_POINTS_DIVISOR_BIGINT;

  // Add extra 5% for safety
  const requiredBufferBps = bufferBps + (BASIS_POINTS_DIVISOR_BIGINT / 100n) * 5n;

  return requiredBufferBps;
}

export function getExecutionFee(
  chainId: number,
  gasLimits: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: bigint,
  gasPrice: bigint,
  oraclePriceCount: bigint
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken) return undefined;

  // #region adjustGasLimitForEstimate. Copy from contract.
  let baseGasLimit = gasLimits.estimatedGasFeeBaseAmount;
  baseGasLimit += gasLimits.estimatedGasFeePerOraclePrice * oraclePriceCount;
  const multiplierFactor = gasLimits.estimatedFeeMultiplierFactor;
  const gasLimit = baseGasLimit + applyFactor(estimatedGasLimit, multiplierFactor);
  // #endregion

  const feeTokenAmount = gasLimit * gasPrice;

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
    gasLimit,
  };
}

/**
 * Only GM deposits. Do not confuse with increase with zero delta size.
 *
 * Copy from contract: `estimateExecuteDepositGasLimit`
 */
export function estimateExecuteDepositGasLimit(
  gasLimits: GasLimitsConfig,
  deposit: {
    // We do not use this yet
    longTokenSwapsCount?: number;
    // We do not use this yet
    shortTokenSwapsCount?: number;
    callbackGasLimit?: bigint;
  }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = BigInt((deposit.longTokenSwapsCount ?? 0) + (deposit.shortTokenSwapsCount ?? 0));
  const gasForSwaps = swapsCount * gasPerSwap;

  return gasLimits.depositToken + (deposit.callbackGasLimit ?? 0n) + gasForSwaps;
}

export function estimateExecuteGlvDepositGasLimit(
  gasLimits: GasLimitsConfig,
  {
    marketsCount,
    isMarketTokenDeposit,
  }: {
    isMarketTokenDeposit;
    marketsCount: bigint;
    initialLongTokenAmount: bigint;
    initialShortTokenAmount: bigint;
  }
) {
  const gasPerGlvPerMarket = gasLimits.glvPerMarketGasLimit;
  const gasForGlvMarkets = gasPerGlvPerMarket * marketsCount;
  const glvDepositGasLimit = gasLimits.glvDepositGasLimit;
  const gasLimit = glvDepositGasLimit + gasForGlvMarkets;

  if (isMarketTokenDeposit) {
    return gasLimit;
  }

  return gasLimit + gasLimits.depositToken;
}

export function estimateExecuteGlvWithdrawalGasLimit(
  gasLimits: GasLimitsConfig,
  {
    marketsCount,
  }: {
    marketsCount: bigint;
  }
) {
  const gasPerGlvPerMarket = gasLimits.glvPerMarketGasLimit;
  const gasForGlvMarkets = gasPerGlvPerMarket * marketsCount;
  const glvWithdrawalGasLimit = gasLimits.glvWithdrawalGasLimit;
  const gasLimit = glvWithdrawalGasLimit + gasForGlvMarkets;

  return gasLimit + gasLimits.withdrawalMultiToken;
}

/**
 * Only GM withdrawals. Do not confuse with decrease with zero delta size.
 *
 * Copy from contract: `estimateExecuteWithdrawalGasLimit`
 */
export function estimateExecuteWithdrawalGasLimit(
  gasLimits: GasLimitsConfig,
  withdrawal: { callbackGasLimit?: bigint }
) {
  // Swap is not used but supported in the contract.
  // const gasPerSwap = gasLimits.singleSwap;
  // const swapsCount = 0n;
  // const gasForSwaps = swapsCount * gasPerSwap;

  return gasLimits.withdrawalMultiToken + (withdrawal.callbackGasLimit ?? 0n);
}

/**
 * Copy from contract: `estimateExecuteShiftGasLimit`
 */
export function estimateExecuteShiftGasLimit(gasLimits: GasLimitsConfig, shift: { callbackGasLimit?: bigint }) {
  return gasLimits.shift + (shift.callbackGasLimit ?? 0n);
}

/**
 * Copy from contract: `estimateExecuteIncreaseOrderGasLimit`
 */
export function estimateExecuteIncreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: bigint }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = BigInt(order.swapsCount ?? 0);

  return gasLimits.increaseOrder + gasPerSwap * swapsCount + (order.callbackGasLimit ?? 0n);
}

/**
 * Copy from contract: `estimateExecuteDecreaseOrderGasLimit`
 */
export function estimateExecuteDecreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount: number; callbackGasLimit?: bigint; decreaseSwapType?: DecreasePositionSwapType }
) {
  const gasPerSwap = gasLimits.singleSwap;
  let swapsCount = BigInt(order.swapsCount);

  if (order.decreaseSwapType !== DecreasePositionSwapType.NoSwap) {
    swapsCount += 1n;
  }

  return gasLimits.decreaseOrder + gasPerSwap * swapsCount + (order.callbackGasLimit ?? 0n);
}

export function estimateExecuteSwapOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount: number; callbackGasLimit?: bigint }
) {
  const gasPerSwap = gasLimits.singleSwap;
  const swapsCount = BigInt(order.swapsCount);

  return gasLimits.swapOrder + gasPerSwap * swapsCount + (order.callbackGasLimit ?? 0n);
}
