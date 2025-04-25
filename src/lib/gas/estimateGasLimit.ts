import type { Provider } from "ethers";
import { BaseError, decodeErrorResult, type Address, type Hex, type PublicClient } from "viem";

import { extendError } from "lib/errors";
import { abis } from "sdk/abis";

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

export async function estimateGasLimitMultichain(
  client: PublicClient,
  txnData: {
    to: string;
    data: string;
    from: string;
    value?: bigint;
  }
): Promise<bigint> {
  try {
    const gasLimit = await client.estimateGas({
      to: txnData.to as Address,
      data: txnData.data as Hex,
      account: txnData.from as Address,
      value: txnData.value,
    });

    return applyGasLimitBuffer(gasLimit);
  } catch (error) {
    if ("walk" in error && typeof error.walk === "function") {
      const errorWithData = (error as BaseError).walk((e) => "data" in (e as any)) as (Error & { data: string }) | null;

      if (errorWithData && errorWithData.data) {
        const data = errorWithData.data;

        const decodedError = decodeErrorResult({
          abi: abis.CustomErrorsArbitrumSepolia,
          data: data as Hex,
        });

        const customError = new Error();

        customError.name = decodedError.errorName;
        customError.message = decodedError.errorName;
        customError.cause = error;

        throw extendError(customError, {
          errorContext: "gasLimit",
        });
      }
    }

    throw error;
  }
}
