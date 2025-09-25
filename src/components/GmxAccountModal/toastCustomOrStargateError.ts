import { decodeErrorResult } from "viem";

import type { AnyChainId } from "config/chains";
import { StargateErrorsAbi } from "config/multichain";
import { helperToast } from "lib/helperToast";
import { abis } from "sdk/abis";

import { getTxnErrorToast } from "components/Errors/errorToasts";

export function toastCustomOrStargateError(chainId: AnyChainId, error: Error) {
  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;

  const data = (error as any)?.info?.error?.data ?? (error as any)?.data;
  if (data) {
    try {
      const parsedError = decodeErrorResult({
        abi: abis.CustomErrors.concat(StargateErrorsAbi),
        data,
      });

      prettyErrorName = parsedError.errorName;
      prettyErrorMessage = JSON.stringify(parsedError, null, 2);
    } catch (decodeError) {
      // pass
    }
  }

  const toastContext = getTxnErrorToast(
    chainId,
    {
      errorMessage: prettyErrorMessage,
    },
    {
      defaultMessage: prettyErrorName,
    }
  );

  helperToast.error(toastContext.errorContent, {
    autoClose: toastContext.autoCloseToast,
  });

  const prettyError = new Error(prettyErrorMessage);
  prettyError.name = prettyErrorName;

  return prettyError;
}
