import cryptoJs from "crypto-js";
import {
  Abi,
  AbiParameterToPrimitiveType,
  ContractErrorName,
  decodeErrorResult,
  ExtractAbiItem,
  BaseError as ViemBaseError,
} from "viem";

import { abis } from "abis";

import {
  CustomErrorName,
  TxErrorType,
  extractDataFromError,
  extractTxnError,
  getIsUserError,
  getIsUserRejectedError,
} from "./transactionsErrors";

export function extractErrorDataFromViemError(error: any): string | undefined {
  if (!("walk" in error && typeof error.walk === "function")) {
    return undefined;
  }

  let data: string | undefined;
  (error as ViemBaseError).walk((e: any) => {
    if (typeof e?.data === "string") {
      data = e.data;
      return true;
    }
    if (typeof e?.data?.data === "string") {
      data = e.data.data;
      return true;
    }
    if (typeof e?.raw === "string") {
      data = e.raw;
      return true;
    }
    return false;
  });

  return data;
}

export type OrderErrorContext =
  | "simulation"
  | "gasLimit"
  | "gasPrice"
  | "bestNonce"
  | "sending"
  | "pending"
  | "relayer"
  | "minting"
  | "execution"
  | "unknown";

export type ErrorLike = {
  message?: string;
  stack?: string;
  name?: string;
  code?: number | string;
  data?: any;
  error?: ErrorLike;
  errorSource?: string;
  errorContext?: OrderErrorContext;
  parentError?: ErrorLike;
  tags?: string;
  isAdditionalValidationPassed?: boolean;
  additionalValidationType?: string;
  info?: {
    error?: ErrorLike;
  };
};

export type ErrorData = {
  errorContext?: OrderErrorContext;
  errorMessage?: string;
  errorGroup?: string;
  errorStack?: string;
  errorStackHash?: string;
  errorStackGroup?: string;
  errorName?: string;
  contractError?: string;
  contractErrorArgs?: any;
  isUserError?: boolean;
  isUserRejectedError?: boolean;
  reason?: string;
  data?: any;
  txErrorType?: TxErrorType;
  txErrorData?: unknown;
  errorSource?: string;
  isAdditionalValidationPassed?: boolean;
  additionalValidationType?: string;
  parentError?: ErrorData;
  errorDepth?: number;
};

const URL_REGEXP =
  /((?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\\+~#=]{2,256}\.[a-z]{2,6}\b(?::\d+)?)(?:[-a-zA-Z0-9@:%_\\+.~#?&\\/\\/=]*)/gi;

const MAX_ERRORS_DEPTH = 1;

export function extendError(
  error: ErrorLike,
  params: {
    errorContext?: OrderErrorContext;
    errorSource?: string;
    isAdditionalValidationPassed?: boolean;
    additionalValidationType?: string;
    data?: any;
  }
): ErrorLike {
  error.errorContext = params.errorContext;
  error.errorSource = params.errorSource;
  error.isAdditionalValidationPassed = params.isAdditionalValidationPassed;
  error.additionalValidationType = params.additionalValidationType;
  error.data = params.data;

  return error;
}

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
  const data = typeof error === "string" ? undefined : error?.data;

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

    if (!contractError) {
      const errorData =
        (error && typeof error === "object" ? extractErrorDataFromViemError(error) : undefined) ??
        extractDataFromError(errorMessage) ??
        extractDataFromError((error as any)?.message);

      if (errorData) {
        try {
          const parsedError = decodeErrorResult({
            abi: abis.CustomErrors as Abi,
            data: errorData,
          });

          if (parsedError) {
            contractError = parsedError.errorName;
            contractErrorArgs = parsedError.args;
          }
        } catch {
          //
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
    data,
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

export function isContractError(error: ErrorData, errorType: CustomErrorName) {
  return error.contractError === errorType;
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

export class CustomError extends Error {
  isGmxCustomError = true;
  args: any;

  constructor({ name, message, args }: { name: string; message: string; args: any }) {
    super(message);
    this.name = name;
    this.args = args;
  }
}

export function isCustomError(error: Error | undefined): error is CustomError {
  return (error as CustomError)?.isGmxCustomError === true;
}

export type ParsedCustomError = {
  name: string;
  args?: {
    [key in ExtractAbiItem<
      typeof abis.CustomErrors,
      ContractErrorName<typeof abis.CustomErrors>
    >["inputs"][number]["name"]]: AbiParameterToPrimitiveType<
      Extract<
        ExtractAbiItem<typeof abis.CustomErrors, ContractErrorName<typeof abis.CustomErrors>>["inputs"][number],
        {
          name: key;
        }
      >,
      "inputs"
    >;
  };
};

export function tryDecodeCustomError(reasonBytes: string): ParsedCustomError | undefined {
  try {
    const decoded = decodeErrorResult({
      abi: abis.CustomErrors,
      data: reasonBytes,
    });

    // Convert args array to key-value dictionary for backward compatibility
    if (
      decoded.args &&
      Array.isArray(decoded.args) &&
      decoded.abiItem &&
      "inputs" in decoded.abiItem &&
      decoded.abiItem.inputs
    ) {
      const argsDict: Record<string, any> = {};
      for (const [index, input] of decoded.abiItem.inputs.entries()) {
        argsDict[input.name] = decoded.args[index];
      }
      return { name: decoded.errorName, args: argsDict as any };
    }

    return { name: decoded.errorName, args: undefined };
  } catch {
    return undefined;
  }
}

export function decodeErrorFromViemError(error: any): ParsedCustomError | undefined {
  const data = extractErrorDataFromViemError(error);
  if (!data) {
    return undefined;
  }
  return tryDecodeCustomError(data);
}
