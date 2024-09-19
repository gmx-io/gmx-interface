import CustomErrors from "abis/CustomErrors.json";
import cryptoJs from "crypto-js";
import { extractDataFromError } from "domain/synthetics/orders/simulateExecuteTxn";
import { ethers } from "ethers";
import { extractError, getIsUserError, getIsUserRejectedError, TxErrorType } from "../contracts/transactionErrors";
import { ErrorMetricData } from "./types";

const IGNORE_ERROR_MESSAGES = ["user rejected action", "failed to fetch"];

const customErrors = new ethers.Contract(ethers.ZeroAddress, CustomErrors.abi);

export function prepareErrorMetricData(error: unknown): ErrorMetricData | undefined {
  // all human readable details are in info field
  const errorInfo = (error as any)?.info?.error;

  let errorMessage = "Unknown error";
  let errorStack: string | undefined = undefined;
  let errorStackHash: string | undefined = undefined;
  let errorName: string | undefined = undefined;
  let contractError: string | undefined = undefined;
  let txErrorType: TxErrorType | undefined = undefined;
  let errorGroup: string | undefined = undefined;
  let txErrorData: any = undefined;
  let isUserError: boolean | undefined = undefined;
  let isUserRejectedError: boolean | undefined = undefined;

  try {
    errorMessage = hasMessage(errorInfo)
      ? errorInfo.message ?? (hasMessage(error) ? error.message : String(error))
      : String(error);

    if (IGNORE_ERROR_MESSAGES.some((ignore) => errorMessage.toLowerCase().startsWith(ignore))) {
      return;
    }

    errorStack = hasStack(error) ? error.stack : undefined;

    if (hasName(errorInfo)) {
      errorName = errorInfo.name;
    } else if (hasName(error)) {
      errorName = error.name;
    }

    try {
      const txError = errorInfo ? extractError(errorInfo as any) : extractError(error as any);

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
        const parsedError = customErrors.interface.parseError(errorData);

        if (parsedError) {
          contractError = parsedError.name;
        }
      }
    }
  } catch (e) {
    //
  }

  if (errorStack) {
    errorStackHash = cryptoJs.SHA256(errorStack).toString(cryptoJs.enc.Hex);
  }

  if (txErrorType) {
    errorGroup = txErrorType;
  } else if (errorMessage) {
    errorGroup = errorMessage.slice(0, 30);
  }

  return {
    errorMessage,
    errorGroup,
    errorStack,
    errorStackHash,
    errorName,
    contractError,
    isUserError,
    isUserRejectedError,
    txErrorType,
    txErrorData,
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
