import cryptoJs from "crypto-js";
import { Abi, Address, decodeErrorResult } from "viem";

import { abis } from "sdk/abis";
import { ErrorData, ErrorLike, OrderErrorContext } from "sdk/utils/errors/parseError";
import {
  TxErrorType,
  extractDataFromError,
  extractTxnError,
  getIsUserError,
  getIsUserRejectedError,
} from "sdk/utils/errors/transactionsErrors";

const URL_REGEXP =
  /((?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\\+~#=]{2,256}\.[a-z]{2,6}\b(?::\d+)?)(?:[-a-zA-Z0-9@:%_\\+.~#?&\\/\\/=]*)/gi;

const MAX_ERRORS_DEPTH = 1;

export function parseError(error: ErrorLike | string | undefined, errorDepth = 0): ErrorData | undefined {
  if (errorDepth > MAX_ERRORS_DEPTH) {
    return undefined;
  }

  // all human readable details are in info field
  const errorInfo = typeof error === "string" ? undefined : error?.info?.error;
  const errorSource = typeof error === "string" ? undefined : error?.errorSource;
  const errorContext: OrderErrorContext | undefined = typeof error === "string" ? undefined : error?.errorContext;
  const isAdditionalValidationPassed = typeof error === "string" ? undefined : error?.isAdditionalValidationPassed;
  const additionalValidationType = typeof error === "string" ? undefined : error?.additionalValidationType;

  let errorMessage = "Unknown error";
  let errorStack: string | undefined = undefined;
  let errorStackHash: string | undefined = undefined;
  let errorName: string | undefined = undefined;
  let contractError: string | undefined = undefined;
  let contractErrorArgs: any = undefined;
  let txErrorType: TxErrorType | undefined = undefined;
  let errorGroup: string | undefined = "Unknown group";
  let errorStackGroup = "Unknown stack group";
  let txErrorData: any = undefined;
  let isUserError: boolean | undefined = undefined;
  let isUserRejectedError: boolean | undefined = undefined;
  let parentError: ErrorData | undefined = undefined;

  try {
    errorMessage = hasMessage(errorInfo)
      ? errorInfo.message ?? (hasMessage(error) ? error.message : String(error))
      : String(error);

    errorStack = hasStack(error) ? error.stack : undefined;

    if (hasName(errorInfo)) {
      errorName = errorInfo.name;
    } else if (hasName(error)) {
      errorName = error.name;
    }

    try {
      let txError: ReturnType<typeof extractTxnError> | undefined;

      if (errorInfo) {
        txError = extractTxnError(errorInfo);
      } else if (error && typeof error === "object") {
        txError = extractTxnError(error);
      }

      if (txError && txError.length) {
        const [message, type, errorData] = txError;
        errorMessage = message;
        txErrorType = type || undefined;
        txErrorData = errorData;
        isUserError = type ? getIsUserError(type) : false;
        isUserRejectedError = type ? getIsUserRejectedError(type) : false;
      }
    } catch (e) {
      //
    }

    if (errorMessage) {
      const errorData = extractDataFromError(errorMessage) ?? extractDataFromError((error as any)?.message);
      if (errorData) {
        const parsedError = decodeErrorResult({
          abi: abis.CustomErrorsArbitrumSepolia as Abi,
          data: errorData as Address,
        });

        if (parsedError) {
          contractError = parsedError.errorName;
          contractErrorArgs = parsedError.args;
        }
      }
    }

    if (typeof error !== "string" && error?.parentError) {
      parentError = parseError(error.parentError, errorDepth + 1);
    }
  } catch (e) {
    //
  }

  if (errorStack) {
    errorStackHash = cryptoJs.SHA256(errorStack).toString(cryptoJs.enc.Hex);
    errorStackGroup = errorStack.slice(0, 300);
    errorStackGroup = errorStackGroup.replace(URL_REGEXP, "$1");
    errorStackGroup = errorStackGroup.replace(/\d+/g, "XXX");
  }

  if (txErrorType) {
    errorGroup = `Txn Error: ${txErrorType}`;
  } else if (errorMessage) {
    errorGroup = errorMessage.slice(0, 300);
    errorGroup = errorGroup.replace(URL_REGEXP, "$1");
    errorGroup = errorGroup.replace(/\d+/g, "XXX");
    errorGroup = errorGroup.slice(0, 50);
  } else if (errorName) {
    errorGroup = errorName;
  }

  return {
    errorMessage,
    errorGroup,
    errorStackGroup,
    errorStack,
    errorStackHash,
    errorName,
    contractError,
    contractErrorArgs,
    errorContext,
    isUserError,
    isUserRejectedError,
    txErrorType,
    txErrorData,
    errorSource,
    parentError,
    isAdditionalValidationPassed,
    additionalValidationType,
    errorDepth,
  };
}

function hasMessage(error: unknown): error is { message: string } {
  return !!error && typeof error === "object" && typeof (error as { message: string }).message === "string";
}

function hasStack(error: unknown): error is { stack: string } {
  return !!error && typeof error === "object" && typeof (error as { stack: string }).stack === "string";
}

function hasName(error: unknown): error is { name: string } {
  return !!error && typeof error === "object" && typeof (error as { name: string }).name === "string";
}
