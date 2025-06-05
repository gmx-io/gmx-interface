import { StargateErrorsAbi } from "domain/multichain/stargatePools";
import { decodeErrorResult } from "viem";

import type { UiSupportedChain } from "config/chains";
import { helperToast } from "lib/helperToast";
import { abis } from "sdk/abis";

import { getTxnErrorToast } from "components/Errors/errorToasts";

export function toastCustomOrStargateError(chainId: UiSupportedChain, error: Error) {
  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;

  const data = (error as any)?.info?.error?.data ?? (error as any)?.data;
  if (data) {
    try {
      const parsedError = decodeErrorResult({
        abi: abis.CustomErrorsArbitrumSepolia.concat(StargateErrorsAbi),
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
