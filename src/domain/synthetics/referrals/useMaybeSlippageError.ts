import { useMemo } from "react";
import { decodeErrorResult, isHex, type Hex } from "viem";

import { CustomErrorName } from "sdk/utils/errors";
import { decodeErrorFromViemError, isCustomError } from "sdk/utils/errors/parseError";

export function isMaybeSlippageError(error: Error | undefined): boolean {
  if (!error) {
    return false;
  }

  let callFailData: Hex | undefined = undefined;

  if (isCustomError(error)) {
    if (error.name !== CustomErrorName.ExternalCallFailed) {
      return false;
    }

    callFailData = isHex(error.args?.data) ? error.args.data : undefined;
  } else {
    const parsedError = decodeErrorFromViemError(error);

    if (parsedError?.name !== CustomErrorName.ExternalCallFailed) {
      return false;
    }

    callFailData = isHex(parsedError.args?.data) ? parsedError.args.data : undefined;
  }

  if (!callFailData) {
    return false;
  }

  let innerError: string | undefined = undefined;

  try {
    const decoded = decodeErrorResult({
      abi: [
        {
          type: "error",
          name: "Error",
          inputs: [{ name: "message", type: "string" }],
        },
      ],
      data: callFailData,
    });

    innerError = decoded.errorName === "Error" ? decoded.args[0] : undefined;
  } catch {
    // pass
  }

  if (!innerError) {
    return false;
  }

  return innerError === "Return amount is not enough";
}

export function useMaybeSlippageError(error: Error | undefined): boolean {
  return useMemo(() => isMaybeSlippageError(error), [error]);
}
