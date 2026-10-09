import type { ReactNode } from "react";
import { Abi, decodeErrorResult } from "viem";

import type { AnyChainId } from "config/chains";
import { StargateErrorsAbi } from "config/multichain";
import { parseError } from "lib/errors";
import { decodeInnermostCustomErrorFromError, extractErrorRevertData } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { TradingActionName } from "lib/tradingErrorTracker";
import { abis } from "sdk/abis";
import { TxErrorType } from "sdk/utils/errors/transactionsErrors";

import {
  type ExpressTxnErrorContext,
  getInsufficientBalanceToastBanner,
  getTxnErrorToast,
} from "components/Errors/errorToasts";
import { getContractErrorToastContent } from "components/Errors/getContractErrorToastContent";

export function toastCustomOrStargateError(
  chainId: AnyChainId,
  error: Error,
  errorInfo?: {
    actionName?: TradingActionName;
    requestId?: string;
    metricId?: string;
    collateral?: string;
    isLpWithdrawal?: boolean;
    defaultMessage?: ReactNode;
    expressTxn?: ExpressTxnErrorContext;
  }
) {
  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;

  const data = extractErrorRevertData(error);
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

  const customError = decodeInnermostCustomErrorFromError(error);
  const errorData = parseError(error);
  const expressTxn = errorInfo?.expressTxn;

  const toastContext = getInsufficientBalanceToastBanner({ chainId, errorData, expressTxn })
    ? getTxnErrorToast(chainId, errorData, { defaultMessage: errorInfo?.defaultMessage, expressTxn })
    : getTxnErrorToast(
        chainId,
        {
          errorMessage: prettyErrorMessage,
          txErrorType: errorData?.isUserRejectedError ? TxErrorType.UserDenied : undefined,
        },
        {
          defaultMessage:
            getContractErrorToastContent({
              chainId,
              errorData: { contractError: customError?.name, contractErrorArgs: customError?.args },
              isLpWithdrawal: errorInfo?.isLpWithdrawal,
            }) ?? errorInfo?.defaultMessage,
        }
      );

  helperToast.error(toastContext.errorContent, {
    autoClose: toastContext.autoCloseToast,
    tradingErrorInfo: errorInfo?.actionName
      ? {
          actionName: errorInfo.actionName,
          errorData,
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
