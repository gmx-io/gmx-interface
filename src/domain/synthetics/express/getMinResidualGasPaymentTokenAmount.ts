import {
  DEFAULT_MAX_RESIDUAL_GAS_USD,
  DEFAULT_MIN_RESIDUAL_GAS_USD,
  RESIDUAL_GAS_AMOUNT_MULTIPLIER,
} from "sdk/configs/fees";
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
    DEFAULT_MIN_RESIDUAL_GAS_USD,
    gasPaymentToken.decimals,
    gasPaymentToken.prices.minPrice
  )!;

  const maxResidualAmount = convertToTokenAmount(
    DEFAULT_MAX_RESIDUAL_GAS_USD,
    gasPaymentToken.decimals,
    gasPaymentToken.prices.maxPrice
  )!;

  let residualAmount = minResidualAmount;
  if (applyBuffer) {
    residualAmount = gasPaymentTokenAmount * RESIDUAL_GAS_AMOUNT_MULTIPLIER;
  }

  return bigMath.clamp(residualAmount, minResidualAmount, maxResidualAmount);
}
