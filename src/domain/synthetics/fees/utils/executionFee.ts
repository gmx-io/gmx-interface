import { EXECUTION_FEE_CONFIG_V2, GAS_PRICE_PREMIUM_MAP, MAX_PRIORITY_FEE_PER_GAS_MAP } from "config/chains";
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

  gasPrice = gasPrice + buffer;
  gasPrice = gasPrice + premium;

  return gasPrice + premium;
}

export function getExecutionFeeBufferBps(chainId: number, settledBufferBps: number | undefined) {
  return BigInt(settledBufferBps ?? EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps ?? 0);
}

export function getGasPremium(chainId: number) {
  return GAS_PRICE_PREMIUM_MAP[chainId] ?? 0n;
}

export function getMaxPriorityFeePerGas(chainId: number, onChainMaxPriorityFeePerGas: bigint | undefined | null) {
  const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId];

  if (!executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
    return undefined;
  }

  return bigMath.max(onChainMaxPriorityFeePerGas ?? 0n, MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n);
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
