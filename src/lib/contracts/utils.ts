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
  const MAX_NONCE_NEEDED = 3;
  const MAX_WAIT = 5000;
  const ONE_MORE_WAIT = 1000;

  return new Promise(async (resolve, reject) => {
    const results: number[] = [];
    let resolved = false;

    const handleResolve = () => {
      resolved = true;

      if (results.length) {
        // eslint-disable-next-line no-console
        console.log("Nonces been received: ", results);
        resolve(Math.max(...results));
      } else {
        reject(new Error("Failed to fetch nonce from any provider"));
      }
    };

    let timerId = setTimeout(handleResolve, MAX_WAIT);

    const setResolveTimeout = (time: number) => {
      clearTimeout(timerId);

      if (resolved) return;

      if (time) {
        timerId = setTimeout(handleResolve, time);
      } else {
        handleResolve();
      }
    };

    await Promise.all(
      providers.map((provider, i) =>
        provider
          .getNonce("pending")
          .then((nonce) => results.push(nonce))
          .then(() => {
            if (results.length === providers.length || results.length >= MAX_NONCE_NEEDED) {
              setResolveTimeout(0);
            } else {
              setResolveTimeout(ONE_MORE_WAIT);
            }
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(`Error fetching nonce from provider ${i}: ${error.message}`);
          })
      )
    );

    setResolveTimeout(0);
  });
}
