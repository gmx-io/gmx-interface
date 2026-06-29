import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { ErrorData, getStringContractErrorArg, tryDecodeCustomError } from "lib/errors";
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
