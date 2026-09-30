import {
  ContractsChainId,
  getExecutionFeeConfig,
  getExecutionFeePriorityFeeAllowance,
  getGasPricePremium,
  getMaxPriorityFeePerGas as getMaxPriorityFeePerGasConfig,
} from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { ExecutionFee } from "sdk/utils/fees/types";
import type { ExecutionFeeEstimate } from "sdk/utils/orderTransactions";

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

// The same estimate priced for express, which pays no priority fee.
export function getExpressExecutionFeeAmount(chainId: number, executionFee: ExecutionFee) {
  return bigMath.max(
    0n,
    executionFee.feeTokenAmount -
      getExecutionFeePriorityFeeAllowance(chainId as ContractsChainId) * executionFee.gasLimit
  );
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
  estimatedOrders?: ExecutionFeeEstimate[];
  currentBufferBps: bigint;
  premium: bigint;
}) {
  const {
    minExecutionFee,
    executionFee,
    estimatedExecutionFee,
    estimatedExecutionGasLimit,
    estimatedOrders,
    currentBufferBps,
    premium,
  } = p;

  if (currentBufferBps === 0n) {
    return undefined;
  }

  const orderGasLimit = getReportedOrderGasLimit({
    executionFee,
    estimatedExecutionFee,
    estimatedExecutionGasLimit,
    estimatedOrders,
  });

  if (orderGasLimit === undefined || orderGasLimit === 0n) {
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

// The contract reports the fee of a single order: take that order's gas limit when the estimate lists it,
// otherwise its share of the whole transaction's estimate (a batch may contain several orders).
function getReportedOrderGasLimit(p: {
  executionFee: bigint;
  estimatedExecutionFee: bigint | undefined;
  estimatedExecutionGasLimit: bigint | undefined;
  estimatedOrders: ExecutionFeeEstimate[] | undefined;
}) {
  const { executionFee, estimatedExecutionFee, estimatedExecutionGasLimit, estimatedOrders } = p;

  const reportedOrder = estimatedOrders?.find((order) => order.executionFee === executionFee && order.gasLimit > 0n);

  if (reportedOrder) {
    return reportedOrder.gasLimit;
  }

  if (
    estimatedExecutionFee === undefined ||
    estimatedExecutionFee === 0n ||
    estimatedExecutionGasLimit === undefined ||
    estimatedExecutionGasLimit === 0n
  ) {
    return undefined;
  }

  return bigMath.mulDiv(estimatedExecutionGasLimit, executionFee, estimatedExecutionFee);
}
