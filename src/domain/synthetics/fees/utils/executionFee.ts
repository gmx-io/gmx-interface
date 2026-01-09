import {
  ContractsChainId,
  getExecutionFeeConfig,
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

export function getMaxPriorityFeePerGas(chainId: number, onChainMaxPriorityFeePerGas: bigint | undefined | null) {
  const executionFeeConfig = getExecutionFeeConfig(chainId as ContractsChainId);

  if (!executionFeeConfig?.shouldUseMaxPriorityFeePerGas) {
    return undefined;
  }

  return bigMath.max(
    onChainMaxPriorityFeePerGas ?? 0n,
    getMaxPriorityFeePerGasConfig(chainId as ContractsChainId) ?? 0n
  );
}

export function getMinimumExecutionFeeBufferBps(p: {
  minExecutionFee: bigint;
  estimatedExecutionFee: bigint;
  currentBufferBps: bigint;
  premium: bigint;
  gasLimit: bigint;
}) {
  const { minExecutionFee, estimatedExecutionFee, currentBufferBps, premium, gasLimit } = p;

  if (gasLimit === 0n || currentBufferBps === 0n) {
    return undefined;
  }

  const estimatedGasPriceWithBuffer = estimatedExecutionFee / gasLimit - premium;

  const baseGasPrice =
    (estimatedGasPriceWithBuffer * BASIS_POINTS_DIVISOR_BIGINT) / (BASIS_POINTS_DIVISOR_BIGINT + currentBufferBps);

  if (baseGasPrice === 0n) {
    return undefined;
  }

  // Calculate target gas price (without premium)
  const targetGasPrice = minExecutionFee / gasLimit - premium;
  const bufferBps = (targetGasPrice * BASIS_POINTS_DIVISOR_BIGINT) / baseGasPrice - BASIS_POINTS_DIVISOR_BIGINT;

  // Add extra 5% for safety
  const requiredBufferBps = bufferBps + (BASIS_POINTS_DIVISOR_BIGINT / 100n) * 5n;

  return requiredBufferBps;
}
