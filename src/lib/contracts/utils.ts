import { GAS_PRICE_ADJUSTMENT_MAP, MAX_GAS_PRICE_MAP } from "config/chains";
import { Contract, Provider } from "ethers";

export async function setGasPrice(txnOpts: any, provider: Provider, chainId: number) {
  let maxGasPrice = MAX_GAS_PRICE_MAP[chainId];
  const premium = GAS_PRICE_ADJUSTMENT_MAP[chainId] || 0n;

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;

  if (maxGasPrice) {
    if (gasPrice !== undefined && gasPrice !== null && gasPrice > maxGasPrice) {
      maxGasPrice = gasPrice;
    }

    // the wallet provider might not return maxPriorityFeePerGas in feeData
    // in which case we should fallback to the usual getGasPrice flow handled below
    if (feeData && feeData.maxPriorityFeePerGas !== undefined && feeData.maxPriorityFeePerGas !== null) {
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

  let gasLimit = await contract[method].estimateGas(...params, { value });

  if (gasLimit < 22000) {
    gasLimit = 22000n;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}
