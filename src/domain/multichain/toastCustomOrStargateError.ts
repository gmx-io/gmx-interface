import type { CallExceptionError, EthersError } from "ethers";
import { Abi, decodeErrorResult } from "viem";

import type { AnyChainId } from "config/chains";
import { StargateErrorsAbi } from "config/multichain";
import { extractErrorDataFromViemError, isCustomError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { TradingActionName } from "lib/tradingErrorTracker";
import { abis } from "sdk/abis";

import { getTxnErrorToast } from "components/Errors/errorToasts";

export function toastCustomOrStargateError(
  chainId: AnyChainId,
  error: Error,
  errorInfo?: { actionName?: TradingActionName; requestId?: string; metricId?: string; collateral?: string }
) {
  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;
  let contractError: string | undefined;
  let contractErrorArgs: unknown;

  if (isCustomError(error)) {
    contractError = error.name;
    contractErrorArgs = error.args;
  }

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
      contractError = parsedError.errorName;
      contractErrorArgs = parsedError.args;
    } catch (decodeError) {
      // pass
    }
  }

  const toastContext = getTxnErrorToast(
    chainId,
    {
      errorMessage: prettyErrorMessage,
      contractError,
      contractErrorArgs,
    },
    {
      defaultMessage: prettyErrorName,
    }
  );

  helperToast.error(toastContext.errorContent, {
    autoClose: toastContext.autoCloseToast,
    tradingErrorInfo: errorInfo?.actionName
      ? {
          actionName: errorInfo.actionName,
          errorData: error,
          requestId: errorInfo.requestId,
          metricId: errorInfo.metricId,
          collateral: errorInfo.collateral,
        }
      : undefined,
  });

  const prettyError = new Error(prettyErrorMessage);
  prettyError.name = prettyErrorName;

  return prettyError;
}
