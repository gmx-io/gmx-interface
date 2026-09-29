import {
  ContractsChainId,
  getExecutionFeeConfig,
  getExecutionFeePriorityFeeAllowance,
  getGasPricePremium,
  getMaxPriorityFeePerGas as getMaxPriorityFeePerGasConfig,
} from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";

export function estimateExecutionGasPrice(p: {
  rawGasPrice: bigint | undefined;
  maxPriorityFeePerGas: bigint | undefined;
  bufferBps: bigint | number | undefined;
  premium: bigint | undefined;
}) {
  let { rawGasPrice = 0n, maxPriorityFeePerGas = 0n, bufferBps = 0n, premium = 0n } = p;

  let gasPrice = rawGasPrice + maxPriorityFeePerGas;

  const buffer = bigMath.mulDiv(gasPrice, BigInt(bufferBps ?? 0), BASIS_POINTS_DIVISOR_BIGINT);

  return gasPrice + premium + buffer;
}

export function getExecutionFeeBufferBps(chainId: number, settledBufferBps: number | undefined) {
  return BigInt(settledBufferBps ?? getExecutionFeeConfig(chainId as ContractsChainId)?.defaultBufferBps ?? 0);
}

// Wallets may add a priority fee on top of the base fee, and the contracts validate the execution fee
// against tx.gasprice, so wallet-signed transactions need an allowance for it. Express transactions
// are sent by the keeper relay with a zero priority fee.
export function getExecutionFeeGasPricePremium(chainId: number, isExpress: boolean) {
  const premium = getGasPricePremium(chainId as ContractsChainId) || 0n;

  return isExpress ? premium : premium + getExecutionFeePriorityFeeAllowance(chainId as ContractsChainId);
}

// The gas price for express estimates: the keeper relay pays no priority fee, so the allowance
// budgeted into the wallet gas price is taken out.
export function getExpressGasPrice(chainId: number, gasPrice: bigint) {
  return bigMath.max(0n, gasPrice - getExecutionFeePriorityFeeAllowance(chainId as ContractsChainId));
}

export function getMaxPriorityFeePerGas(chainId: number, onChainMaxPriorityFeePerGas: bigint | undefined | null) {
  const executionFeeConfig = getExecutionFeeConfig(chainId as ContractsChainId);

  if (!executionFeeConfig?.shouldUseMaxPriorityFeePerGas) {
    return undefined;
  }

  return bigMath.max(
    onChainMaxPriorityFeePerGas ?? 0n,
    getMaxPriorityFeePerGasConfig(chainId as ContractsChainId) || 0n
  );
}

export function getMinimumExecutionFeeBufferBps(p: {
  minExecutionFee: bigint;
  executionFee: bigint;
  estimatedExecutionFee: bigint | undefined;
  estimatedExecutionGasLimit: bigint | undefined;
  currentBufferBps: bigint;
  premium: bigint;
}) {
  const {
    minExecutionFee,
    executionFee,
    estimatedExecutionFee,
    estimatedExecutionGasLimit,
    currentBufferBps,
    premium,
  } = p;

  if (
    estimatedExecutionFee === undefined ||
    estimatedExecutionFee === 0n ||
    estimatedExecutionGasLimit === undefined ||
    estimatedExecutionGasLimit === 0n ||
    currentBufferBps === 0n
  ) {
    return undefined;
  }

  // The contract reports the fee of a single order, while the estimate covers the whole transaction (a batch
  // may contain several orders), so take the gas limit share of the reported order.
  const orderGasLimit = bigMath.mulDiv(estimatedExecutionGasLimit, executionFee, estimatedExecutionFee);

  if (orderGasLimit === 0n) {
    return undefined;
  }

  const estimatedGasPriceWithBuffer = executionFee / orderGasLimit - premium;

  const baseGasPrice =
    (estimatedGasPriceWithBuffer * BASIS_POINTS_DIVISOR_BIGINT) / (BASIS_POINTS_DIVISOR_BIGINT + currentBufferBps);

  if (baseGasPrice <= 0n) {
    return undefined;
  }

  // Calculate target gas price (without premium)
  const targetGasPrice = minExecutionFee / orderGasLimit - premium;
  const bufferBps = (targetGasPrice * BASIS_POINTS_DIVISOR_BIGINT) / baseGasPrice - BASIS_POINTS_DIVISOR_BIGINT;

  // Add extra 5% for safety
  const requiredBufferBps = bufferBps + (BASIS_POINTS_DIVISOR_BIGINT / 100n) * 5n;

  return requiredBufferBps;
}
