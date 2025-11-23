import {
  EXPRESS_DEFAULT_MAX_RESIDUAL_USD,
  EXPRESS_DEFAULT_MIN_RESIDUAL_USD,
  EXPRESS_RESIDUAL_AMOUNT_MULTIPLIER,
} from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";

import { type TokenData, convertToTokenAmount } from "../tokens";
import type { ExpressTxnParams } from "./types";

export function getMinResidualGasPaymentTokenAmount({
  payTokenAddress,
  expressParams,
  gasPaymentToken: rawGasPaymentToken,
  gasPaymentTokenAmount: rawGasPaymentTokenAmount,
  applyBuffer = true,
}: {
  payTokenAddress: string | undefined;
  expressParams?: ExpressTxnParams;
  gasPaymentToken?: TokenData;
  gasPaymentTokenAmount?: bigint;
  applyBuffer?: boolean;
}): bigint {
  const gasPaymentToken = rawGasPaymentToken ?? expressParams?.gasPaymentParams.gasPaymentToken;
  const gasPaymentTokenAmount = rawGasPaymentTokenAmount ?? expressParams?.gasPaymentParams.gasPaymentTokenAmount;

  if (!gasPaymentToken || gasPaymentTokenAmount === undefined || !payTokenAddress) {
    return 0n;
  }

  if (payTokenAddress !== gasPaymentToken.address) {
    return 0n;
  }

  const minResidualAmount = convertToTokenAmount(
    EXPRESS_DEFAULT_MIN_RESIDUAL_USD,
    gasPaymentToken.decimals,
    gasPaymentToken.prices.minPrice
  )!;

  const maxResidualAmount = convertToTokenAmount(
    EXPRESS_DEFAULT_MAX_RESIDUAL_USD,
    gasPaymentToken.decimals,
    gasPaymentToken.prices.maxPrice
  )!;

  let residualAmount = minResidualAmount;
  if (applyBuffer) {
    residualAmount = gasPaymentTokenAmount * EXPRESS_RESIDUAL_AMOUNT_MULTIPLIER;
  }

  return bigMath.clamp(residualAmount, minResidualAmount, maxResidualAmount);
}
