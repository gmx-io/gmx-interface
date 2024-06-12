import {
  GAS_PRICE_PREMIUM_MAP,
  GAS_PRICE_BUFFER_MAP,
  MAX_FEE_PER_GAS_MAP,
  MAX_PRIORITY_FEE_PER_GAS_MAP,
} from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { Contract, BaseContract, Provider } from "ethers";
import { bigMath } from "lib/bigmath";

export async function setGasPrice(txnOpts: any, provider: Provider, chainId: number) {
  let maxFeePerGas = MAX_FEE_PER_GAS_MAP[chainId];
  const premium: bigint = GAS_PRICE_PREMIUM_MAP[chainId] || 0n;

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;

  if (maxFeePerGas) {
    if (gasPrice !== undefined && gasPrice !== null) {
      maxFeePerGas = bigMath.max(gasPrice, maxFeePerGas);
    }

    // the wallet provider might not return maxPriorityFeePerGas in feeData
    // in which case we should fallback to the usual getGasPrice flow handled below
    if (feeData && feeData.maxPriorityFeePerGas !== undefined && feeData.maxPriorityFeePerGas !== null) {
      const maxPriorityFeePerGas = bigMath.max(
        feeData.maxPriorityFeePerGas,
        MAX_PRIORITY_FEE_PER_GAS_MAP[chainId] ?? 0n
      );
      txnOpts.maxFeePerGas = maxFeePerGas;
      txnOpts.maxPriorityFeePerGas = maxPriorityFeePerGas + premium;
      return;
    }
  }

  if (gasPrice === null) {
    throw new Error("Can't fetch gas price");
  }

  const bufferBps: bigint = GAS_PRICE_BUFFER_MAP[chainId] || 0n;
  const buffer = bigMath.mulDiv(gasPrice, bufferBps, BASIS_POINTS_DIVISOR_BIGINT);
  txnOpts.gasPrice = gasPrice + buffer + premium;
  return;
}

export async function getGasLimit(
  contract: Contract | BaseContract,
  method,
  params: any[] = [],
  value?: bigint | number
) {
  const defaultValue = 0n;

  if (!value) {
    value = defaultValue;
  }

  let gasLimit = await contract[method].estimateGas(...params, { value });

  if (gasLimit < 22000) {
    gasLimit = 22000n;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}
