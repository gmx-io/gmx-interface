import { BaseContract, Overrides, Provider, TransactionRequest } from "ethers";

import { EXECUTION_FEE_CONFIG_V2 } from "config/chains";
import { ErrorLike, parseError } from "lib/errors";
import { ErrorEvent } from "lib/metrics";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import { ErrorPattern } from "sdk/utils/errors/transactionsErrors";
import { mustNeverExist } from "sdk/utils/types";

const UNRECOGNIZED_ERROR_PATTERNS: ErrorPattern[] = [
  { msg: "header not found" },
  { msg: "unfinalized data" },
  { msg: "could not coalesce error" },
  { msg: "Internal JSON RPC error" },
  { msg: "execution reverted" },
];

export function getAdditionalValidationType(error: Error) {
  const errorData = parseError(error);

  const shouldTryCallStatic = UNRECOGNIZED_ERROR_PATTERNS.some((pattern) => {
    const isMessageMatch =
      pattern.msg &&
      errorData?.errorMessage &&
      errorData.errorMessage.toLowerCase().includes(pattern.msg.toLowerCase());

    return isMessageMatch;
  });

  if (shouldTryCallStatic) {
    return "tryCallStatic";
  }

  const shouldTryEstimateGas = errorData?.errorStack && errorData.errorStack.includes("estimateGas");

  if (shouldTryEstimateGas) {
    return "tryEstimateGas";
  }

  return undefined;
}

export function getEstimateGasError(provider: Provider, txnData: TransactionRequest) {
  return provider
    .estimateGas(txnData)
    .then(() => {
      return undefined;
    })
    .catch((error) => {
      (error as ErrorLike).errorSource = "getEstimateGasError";
      return error;
    });
}

export async function getCallStaticError(
  chainId: number,
  provider: Provider,
  txnData?: TransactionRequest,
  txnHash?: string
): Promise<{ error?: ErrorLike; txnData?: TransactionRequest }> {
  // if txnData is not provided, try to fetch it from blockchain by txnHash
  if (!txnData && txnHash) {
    try {
      txnData = (await provider.getTransaction(txnHash)) || undefined;
    } catch (error) {
      return { error };
    }
  }

  if (!txnData) {
    const error = new Error("missed transaction data");
    (error as ErrorLike).errorSource = "getTransaction";

    return { error };
  }

  try {
    const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId];

    if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
      delete txnData.gasPrice;
    } else {
      delete txnData.maxPriorityFeePerGas;
      delete txnData.maxFeePerGas;
    }

    await provider.call(txnData);
    return { txnData };
  } catch (error) {
    (error as ErrorLike).errorSource = "getCallStaticError";

    return { error, txnData };
  }
}

export async function additionalTxnErrorValidation(
  error: Error,
  chainId: number,
  provider: Provider,
  txnData: TransactionRequest
) {
  const additionalValidationType = getAdditionalValidationType(error);

  if (!additionalValidationType) {
    return;
  }

  let errorToLog: ErrorLike = error;

  switch (additionalValidationType) {
    case "tryCallStatic": {
      const { error: callStaticError } = await getCallStaticError(chainId, provider, txnData);

      if (callStaticError) {
        callStaticError.parentError = errorToLog;
        errorToLog = callStaticError;
      } else {
        errorToLog.isAdditionalValidationPassed = true;
      }

      errorToLog.additionalValidationType = "tryCallStatic";

      break;
    }

    case "tryEstimateGas": {
      const { error: estimateGasError } = await getEstimateGasError(provider, txnData);

      if (estimateGasError) {
        estimateGasError.parentError = errorToLog;
        errorToLog = estimateGasError;
      } else {
        errorToLog.isAdditionalValidationPassed = true;
      }

      errorToLog.additionalValidationType = "tryEstimateGas";

      break;
    }

    default:
      mustNeverExist(additionalValidationType);
  }

  const errorData = parseError(errorToLog);

  emitMetricEvent<ErrorEvent>({
    event: "error",
    isError: true,
    data: errorData || {},
  });
}

export function makeTransactionErrorHandler(
  chainId: number,
  contract: BaseContract,
  method: string,
  params: any[],
  txnOpts: Overrides,
  from: string
) {
  return async (error) => {
    const data = contract.interface.encodeFunctionData(method, params);
    const to = await contract.getAddress();
    const provider = contract.runner!.provider!;
    const txnData = {
      data,
      to,
      from,
      ...txnOpts,
    };

    additionalTxnErrorValidation(error, chainId, provider, txnData);

    throw error;
  };
}
