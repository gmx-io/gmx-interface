import { t } from "@lingui/macro";
import type { ReactNode } from "react";

import { CustomErrorName, isCustomError } from "lib/errors";

import { getErrorDebugContent } from "components/Errors/errorToasts";
import { getContractErrorMessageFromError } from "components/Errors/getContractErrorMessage";

export function getGmSwapSimulationError({
  chainId,
  error,
  isDeposit,
}: {
  chainId: number;
  error: Error;
  isDeposit: boolean;
}): { text: string; description?: ReactNode } {
  if (isCustomError(error)) {
    if (error.name === "InsufficientMultichainBalance") {
      return { text: t`Insufficient balance` };
    }

    if (error.name === CustomErrorName.MaxPoolAmountExceeded) {
      return { text: t`Maximum pool capacity reached` };
    }
  }

  const contractErrorMessage = getContractErrorMessageFromError({ chainId, error, isLpWithdrawal: !isDeposit });

  if (!contractErrorMessage) {
    return {
      text: isDeposit ? t`Error simulating deposit` : t`Error simulating withdrawal`,
      description: getErrorDebugContent(error),
    };
  }

  return { text: contractErrorMessage };
}
