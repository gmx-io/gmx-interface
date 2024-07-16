import {
  GAS_PRICE_BUFFER_MAP,
  GAS_PRICE_PREMIUM_MAP,
  MAX_FEE_PER_GAS_MAP,
  MAX_PRIORITY_FEE_PER_GAS_MAP,
} from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { BaseContract, Contract, Provider, Wallet } from "ethers";
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

  let gasLimit = 0n;
  try {
    gasLimit = await contract[method].estimateGas(...params, { value });
  } catch (error) {
    // this call should throw another error instead of the `error`
    await contract[method].staticCall(...params, { value });

    // if not we throw estimateGas error
    throw error;
  }

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
