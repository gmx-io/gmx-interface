import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { ErrorData, tryDecodeCustomError } from "lib/errors";
import { CustomErrorName } from "sdk/utils/errors/transactionsErrors";

import { getContractErrorMessage } from "./getContractErrorMessage";

export function getContractErrorToastContent({
  chainId,
  errorData,
  slippageInputId,
  decodeDepth = 0,
}: {
  chainId: number;
  errorData: Pick<ErrorData, "contractError" | "contractErrorArgs">;
  slippageInputId?: string;
  decodeDepth?: number;
}): ReactNode | undefined {
  if (!errorData.contractError) {
    return undefined;
  }

  switch (errorData.contractError) {
    case CustomErrorName.OrderNotFulfillableAtAcceptablePrice:
    case CustomErrorName.InsufficientSwapOutputAmount:
      return (
        <Trans>
          Order error. Prices are volatile for this market, try again by{" "}
          <span
            onClick={() => {
              if (slippageInputId) {
                document.getElementById(slippageInputId)?.focus();
              }
            }}
            className={slippageInputId ? "cursor-pointer underline" : undefined}
          >
            <Trans>increasing the allowed slippage</Trans>
          </span>
        </Trans>
      );

    case CustomErrorName.ExternalCallFailed: {
      if (decodeDepth < 1) {
        const nestedErrorData = getStringContractErrorArg(errorData.contractErrorArgs, 0, "data");
        if (nestedErrorData) {
          const decodedExternalCallError = tryDecodeCustomError(nestedErrorData);

          if (decodedExternalCallError) {
            const nestedContractErrorMessage = getContractErrorToastContent({
              chainId,
              errorData: {
                contractError: decodedExternalCallError.name,
                contractErrorArgs: decodedExternalCallError.args,
              },
              slippageInputId,
              decodeDepth: decodeDepth + 1,
            });

            if (nestedContractErrorMessage) {
              return nestedContractErrorMessage;
            }
          }
        }
      }

      return getContractErrorMessage({ chainId, errorData, decodeDepth });
    }

    default:
      return getContractErrorMessage({ chainId, errorData, decodeDepth });
  }
}

function getContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  if (!contractErrorArgs) {
    return undefined;
  }

  if (Array.isArray(contractErrorArgs)) {
    return contractErrorArgs[index];
  }

  if (typeof contractErrorArgs === "object") {
    if (key && key in contractErrorArgs) {
      return contractErrorArgs[key];
    }

    return Object.values(contractErrorArgs)[index];
  }

  return undefined;
}

function getStringContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  const value = getContractErrorArg(contractErrorArgs, index, key);
  return typeof value === "string" ? value : undefined;
}
