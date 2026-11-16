import type { GasPaymentValidations } from "../types";

export class ExpressEstimationError extends Error {
  name = "ExpressEstimationError";
}

export class ExpressEstimationInsufficientGasPaymentTokenBalanceError extends ExpressEstimationError {
  name = "ExpressEstimationInsufficientGasPaymentTokenBalanceError";
  constructor(
    public readonly params?: {
      balance?: bigint;
      requiredAmount?: bigint;
    }
  ) {
    super();
  }
}

export function getIsValidExpressParams({
  gasPaymentValidations,
}: {
  gasPaymentValidations: GasPaymentValidations;
  [key: string]: unknown;
}): boolean {
  return gasPaymentValidations.isValid;
}

export function getIsConfirmedOutOfGasPaymentTokenBalance(
  gasPaymentValidations:
    | Pick<GasPaymentValidations, "isOutGasTokenBalance" | "isGasPaymentTokenBalanceLoaded">
    | undefined
): boolean {
  return Boolean(gasPaymentValidations?.isGasPaymentTokenBalanceLoaded && gasPaymentValidations.isOutGasTokenBalance);
}
