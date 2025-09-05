import { BaseError, decodeErrorResult, Hex } from "viem";

import { CustomError, extendError, getCustomError, OrderErrorContext } from "lib/errors";
import { abis } from "sdk/abis";

export async function fallbackCustomError<T = void>(f: () => Promise<T>, errorContext: OrderErrorContext) {
  try {
    return await f();
  } catch (error) {
    if ("walk" in error && typeof error.walk === "function") {
      const errorWithData = (error as BaseError).walk((e) => "data" in (e as any)) as (Error & { data: string }) | null;

      if (errorWithData && errorWithData.data) {
        const data = errorWithData.data;

        const decodedError = decodeErrorResult({
          abi: abis.CustomErrors,
          data: data as Hex,
        });

        const prettyError = new CustomError({
          name: decodedError.errorName,
          message: JSON.stringify(decodedError, null, 2),
          args: decodedError.args,
        });

        throw extendError(prettyError, {
          errorContext,
        });
      }
    }

    throw extendError(getCustomError(error), {
      errorContext,
    });
  }
}
