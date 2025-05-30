import { getExcessiveExecutionFee, getHighExecutionFee } from "configs/chains";
import { USD_DECIMALS } from "configs/factors";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { ExecutionFee, GasLimitsConfig, L1ExpressOrderGasReference } from "types/fees";
import { DecreasePositionSwapType } from "types/orders";
import { TokenData, TokensData } from "types/tokens";
import { applyFactor, expandDecimals } from "utils/numbers";
import { convertBetweenTokens, convertToUsd, getTokenData } from "utils/tokens";

export function getExecutionFee(
  chainId: number,
  gasLimits: GasLimitsConfig,
  // TODO optimize we only need the native token data
  tokensData: TokensData,
  estimatedGasLimit: bigint,
  gasPrice: bigint,
  oraclePriceCount: bigint,
  numberOfParts?: number
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken) return undefined;

  // #region adjustGasLimitForEstimate. Copy from contract.
  let baseGasLimit = gasLimits.estimatedGasFeeBaseAmount;
  baseGasLimit += gasLimits.estimatedGasFeePerOraclePrice * oraclePriceCount;
  const multiplierFactor = gasLimits.estimatedFeeMultiplierFactor;
  const gasLimit = baseGasLimit + applyFactor(estimatedGasLimit, multiplierFactor);
  // #endregion

  const feeTokenAmount = gasLimit * gasPrice * BigInt(numberOfParts ?? 1);

  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

  const isFeeHigh = feeUsd > expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS);
  const isFeeVeryHigh = feeUsd > expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS);

  return {
    feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
    gasLimit,
    isFeeHigh,
    isFeeVeryHigh,
  };
}

export function estimateRelayerGasLimit({
  gasLimits,
  tokenPermitsCount,
  feeSwapsCount,
  feeExternalCallsGasLimit,
  oraclePriceCount,
  transactionPayloadGasLimit,
  l1GasLimit,
}: {
  gasLimits: GasLimitsConfig;
  tokenPermitsCount: number;
  feeSwapsCount: number;
  feeExternalCallsGasLimit: bigint;
  oraclePriceCount: number;
  transactionPayloadGasLimit: bigint;
  l1GasLimit: bigint;
}) {
  const feeSwapsGasLimit = gasLimits.singleSwap * BigInt(feeSwapsCount);
  const oraclePricesGasLimit = gasLimits.estimatedGasFeePerOraclePrice * BigInt(oraclePriceCount);
  const tokenPermitsGasLimit = gasLimits.tokenPermitGasLimit * BigInt(tokenPermitsCount);

  const relayParamsGasLimit = feeSwapsGasLimit + oraclePricesGasLimit + tokenPermitsGasLimit + feeExternalCallsGasLimit;

  return relayParamsGasLimit + transactionPayloadGasLimit + l1GasLimit;
}

export function approximateL1GasBuffer({
  l1Reference,
  sizeOfData,
}: {
  l1Reference: L1ExpressOrderGasReference;
  sizeOfData: bigint;
}) {
  const evaluated = Math.round(
    (Number(l1Reference.gasLimit) * Math.log(Number(sizeOfData))) / Math.log(Number(l1Reference.sizeOfData))
  );

  const l1GasLimit = Math.abs(evaluated) < Infinity ? BigInt(evaluated) : l1Reference.gasLimit;

  return l1GasLimit;
}

export function estimateBatchGasLimit({
  gasLimits,
  createOrdersCount,
  updateOrdersCount,
  cancelOrdersCount,
  externalCallsGasLimit,
}: {
  gasLimits: GasLimitsConfig;
  createOrdersCount: number;
  updateOrdersCount: number;
  cancelOrdersCount: number;
  externalCallsGasLimit: bigint;
}) {
  const createOrdersGasLimit = gasLimits.createOrderGasLimit * BigInt(createOrdersCount);
  const updateOrdersGasLimit = gasLimits.updateOrderGasLimit * BigInt(updateOrdersCount);
  const cancelOrdersGasLimit = gasLimits.cancelOrderGasLimit * BigInt(cancelOrdersCount);

  return createOrdersGasLimit + updateOrdersGasLimit + cancelOrdersGasLimit + externalCallsGasLimit;
}

export function estimateBatchMinGasPaymentTokenAmount({
  chainId,
  gasPaymentToken,
  relayFeeToken,
  gasPrice,
  gasLimits,
  l1Reference,
  tokensData,
  createOrdersCount = 1,
  updateOrdersCount = 0,
  cancelOrdersCount = 0,
  executionFeeAmount,
}: {
  chainId: number;
  gasLimits: GasLimitsConfig;
  gasPaymentToken: TokenData;
  relayFeeToken: TokenData;
  tokensData: TokensData;
  gasPrice: bigint;
  l1Reference: L1ExpressOrderGasReference | undefined;
  createOrdersCount: number;
  updateOrdersCount: number;
  cancelOrdersCount: number;
  executionFeeAmount: bigint | undefined;
}) {
  const batchGasLimit = estimateBatchGasLimit({
    gasLimits,
    createOrdersCount,
    updateOrdersCount,
    cancelOrdersCount,
    externalCallsGasLimit: 0n,
  });

  const relayerGasLimit = estimateRelayerGasLimit({
    gasLimits,
    tokenPermitsCount: 0,
    feeSwapsCount: relayFeeToken.address === gasPaymentToken.address ? 0 : 1,
    feeExternalCallsGasLimit: 0n,
    oraclePriceCount: 2,
    transactionPayloadGasLimit: batchGasLimit,
    l1GasLimit: l1Reference?.gasLimit ?? 0n,
  });

  const gasLimit = relayerGasLimit + batchGasLimit;

  const feeAmount = gasLimit * gasPrice;

  const executionGasLimit = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
    swapsCount: 2,
    callbackGasLimit: 0n,
  });

  const executionFee =
    executionFeeAmount ??
    getExecutionFee(chainId, gasLimits, tokensData, executionGasLimit, gasPrice, 4n)?.feeTokenAmount;

  let totalFee = feeAmount + (executionFee ?? 0n);

  const minGasPaymentTokenBalance = convertBetweenTokens(totalFee, relayFeeToken, gasPaymentToken, false)!;

  return minGasPaymentTokenBalance;
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
    isMarketTokenDeposit: boolean;
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
