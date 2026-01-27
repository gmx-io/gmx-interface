import type { CallExceptionError, EthersError } from "ethers";
import { Abi, decodeErrorResult } from "viem";

import type { AnyChainId } from "config/chains";
import { StargateErrorsAbi } from "config/multichain";
import { extractErrorDataFromViemError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { abis } from "sdk/abis";

import { getTxnErrorToast } from "components/Errors/errorToasts";

export function toastCustomOrStargateError(chainId: AnyChainId, error: Error) {
  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;

  const data =
    extractErrorDataFromViemError(error) ??
    (error as EthersError)?.info?.error?.data ??
    (error as CallExceptionError)?.data;
  if (data) {
    try {
      const parsedError = decodeErrorResult({
        abi: (abis.CustomErrors as Abi).concat(StargateErrorsAbi),
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
