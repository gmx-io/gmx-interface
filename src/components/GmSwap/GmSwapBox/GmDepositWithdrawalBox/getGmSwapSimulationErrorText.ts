import { t } from "@lingui/macro";

import { CustomErrorName, isCustomError } from "lib/errors";

import { getContractErrorMessageFromError } from "components/Errors/getContractErrorMessage";

export function getGmSwapSimulationErrorText({
  chainId,
  error,
  isDeposit,
}: {
  chainId: number;
  error: Error;
  isDeposit: boolean;
}): string {
  if (isCustomError(error)) {
    if (error.name === "InsufficientMultichainBalance") {
      return t`Insufficient balance`;
    }

    if (error.name === CustomErrorName.MaxPoolAmountExceeded) {
      return t`Maximum pool capacity reached`;
    }
  }

  return (
    getContractErrorMessageFromError({ chainId, error, isLpWithdrawal: !isDeposit }) ??
    (isDeposit ? t`Error simulating deposit` : t`Error simulating withdrawal`)
  );
}
