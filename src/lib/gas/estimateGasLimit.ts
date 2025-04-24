import { Provider } from "ethers";

import { extendError } from "lib/errors";

const MIN_GAS_LIMIT = 22000n;

export async function estimateGasLimit(
  provider: Provider,
  txnParams: {
    to: string;
    data: string;
    from: string;
    value: bigint | number | undefined;
  }
): Promise<bigint> {
  try {
    const gasLimit = await provider.estimateGas(txnParams);
    return applyGasLimitBuffer(gasLimit);
  } catch (error) {
    try {
      // this call should throw another error instead of the `error`
      await provider.call(txnParams);

      // if not we throw estimateGas error
      throw error;
    } catch (error) {
      throw extendError(error, {
        errorContext: "gasLimit",
      });
    }
  }
}

export function applyGasLimitBuffer(gasLimit: bigint): bigint {
  if (gasLimit < MIN_GAS_LIMIT) {
    gasLimit = MIN_GAS_LIMIT;
  }

  return (gasLimit * 11n) / 10n; // add a 10% buffer
}
