import type { ReactNode } from "react";

import type { ErrorLike } from "lib/errors";

import { getErrorDebugContent } from "./errorToasts";
import { getContractErrorMessageFromError } from "./getContractErrorMessage";

export function getSimulationErrorButtonContent({
  chainId,
  error,
  fallbackText,
}: {
  chainId: number;
  error: ErrorLike;
  fallbackText: string;
}): { text: string; errorDescription?: ReactNode } {
  const contractErrorMessage = getContractErrorMessageFromError({ chainId, error });

  return contractErrorMessage
    ? { text: contractErrorMessage }
    : { text: fallbackText, errorDescription: getErrorDebugContent(error) };
}
