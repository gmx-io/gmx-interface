import type { Provider } from "ethers";

import { extendError } from "lib/errors";
import { ISigner } from "lib/transactions/iSigner";
import { applyGasLimitBuffer } from "sdk/utils/gas/applyBuffer";

export async function estimateGasLimit(
  provider: Provider | ISigner,
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
