import { GAS_PRICE_ADJUSTMENT_MAP, MAX_GAS_PRICE_MAP } from "config/chains";
import { Contract, Provider } from "ethers";
import { bigNumberify } from "../numbers";

export async function setGasPrice(txnOpts: any, provider: Provider, chainId: number) {
  let maxGasPrice = MAX_GAS_PRICE_MAP[chainId];
  const premium = GAS_PRICE_ADJUSTMENT_MAP[chainId] || 0n;

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;

  if (maxGasPrice) {
    if (gasPrice && gasPrice > maxGasPrice) {
      maxGasPrice = gasPrice;
    }

    // the wallet provider might not return maxPriorityFeePerGas in feeData
    // in which case we should fallback to the usual getGasPrice flow handled below
    if (feeData && feeData.maxPriorityFeePerGas) {
      txnOpts.maxFeePerGas = maxGasPrice;
      txnOpts.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas + premium;
      return;
    }
  }

  txnOpts.gasPrice = gasPrice + premium;
  return;
}

export async function getGasLimit(contract: Contract, method, params: any[] = [], value?: bigint | number) {
  const defaultValue = 0n;

  if (!value) {
    value = defaultValue;
  }

  let gasLimit = await contract.estimateGas[method](...params, { value });

  if (gasLimit.lt(22000)) {
    gasLimit = bigNumberify(22000)!;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}
