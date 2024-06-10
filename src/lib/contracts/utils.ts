import { GAS_PRICE_ADJUSTMENT_MAP, MAX_GAS_PRICE_MAP } from "config/chains";
import { Contract, BaseContract, Provider, Wallet } from "ethers";

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

export function getBestNonce(providers: Wallet[]): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const results: number[] = [];

    let pending = providers.length;
    let threshold = 3;
    let shown = false;

    const handleSuccess = () => {
      if (!shown) {
        shown = true;
        // eslint-disable-next-line no-console
        console.log("Nonces been received: ", results);
      }
      resolve(Math.max(...results));
    };
    const handleFailure = () => reject("Failed to fetch nonce from any provider");

    const checkExit = () => {
      if (!pending) {
        if (results.length) {
          handleSuccess();
        } else {
          handleFailure();
        }
      }

      if (results.length >= threshold) {
        handleSuccess();
      }
    };

    providers.forEach((provider, i) =>
      provider
        .getNonce()
        .then((nonce) => results.push(nonce))
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error(`Error fetching nonce from provider ${i}: ${error.message}`);
        })
        .finally(() => pending--)
        .finally(checkExit)
    );

    setTimeout(() => {
      threshold = 2;
      checkExit();
    }, 1000);

    setTimeout(() => {
      threshold = 1;
      checkExit();
    }, 3000);

    setTimeout(() => {
      handleFailure();
    }, 5000);
  });
}
