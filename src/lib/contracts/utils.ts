import { BaseContract, Contract, Wallet } from "ethers";

/**
 * @deprecated use estimateGasLimit instead
 */
export async function getGasLimit(
  contract: Contract | BaseContract,
  method,
  params: any[] = [],
  value?: bigint | number,
  from?: string
) {
  const defaultValue = 0n;

  if (!value) {
    value = defaultValue;
  }

  let gasLimit = 0n;
  try {
    gasLimit = await contract[method].estimateGas(...params, { value, from });
  } catch (error) {
    // this call should throw another error instead of the `error`
    await contract[method].staticCall(...params, { value, from });

    // if not we throw estimateGas error
    throw error;
  }

  if (gasLimit < 22000) {
    gasLimit = 220000n;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}

/**
 * @deprecated
 */
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
