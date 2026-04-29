import type { Provider } from "ethers";

import { extendError } from "lib/errors";
import type { IRpc } from "sdk/utils/rpc";

export function createProviderRpc(provider: Provider): IRpc {
  return {
    estimateGas: async ({ from, to, data, value }) => {
      try {
        return await provider.estimateGas({ from, to, data, value: value ?? 0n });
      } catch (error) {
        try {
          await provider.call({ from, to, data, value: value ?? 0n });
          throw error;
        } catch (callError) {
          throw extendError(callError, { errorContext: "gasLimit" });
        }
      }
    },
    call: async ({ from, to, data, value }) => {
      const result = await provider.call({ from, to, data, value: value ?? 0n });
      return result ?? "";
    },
  };
}
