import {
  DEFAULT_MAX_RESIDUAL_GAS_USD,
  DEFAULT_MIN_RESIDUAL_GAS_USD,
  RESIDUAL_GAS_AMOUNT_MULTIPLIER,
} from "sdk/configs/fees";
import { bigMath } from "sdk/utils/bigmath";

import { TokenBalanceType, TokenData, convertToTokenAmount, getBalanceByBalanceType } from "../tokens";

export enum GasPaymentTokenMaxAvailabilityStatus {
  NotAvailable = "not_available",
  Enough = "enough",
  NotEnough = "not_enough",
  MinimalBuffer = "minimal_buffer",
}

export function applyMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 13n, 10n);
}

export function applyValidMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 14n, 10n);
}

export function getMaxAvailableTokenAmount({
  paymentToken,
  gasPaymentToken,
  gasPaymentTokenAmount,
  balanceType,
  enabled = true,
  ignoreGasPaymentToken = false,
}: {
  gasPaymentTokenAmount?: bigint;
  enabled?: boolean;
  paymentToken?: TokenData;
  gasPaymentToken?: TokenData;
  balanceType: TokenBalanceType;
  ignoreGasPaymentToken?: boolean;
}): {
  maxAvailableAmount: bigint;
  maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus;
} {
  if ((!gasPaymentToken && !ignoreGasPaymentToken) || !paymentToken || !enabled) {
    return {
      maxAvailableAmount: 0n,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.NotAvailable,
    };
  }

  const paymentTokenBalance = getBalanceByBalanceType(paymentToken, balanceType);

  if (paymentTokenBalance === undefined) {
    return {
      maxAvailableAmount: 0n,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.NotAvailable,
    };
  }

  if (ignoreGasPaymentToken || paymentToken.address !== gasPaymentToken?.address) {
    return {
      maxAvailableAmount: paymentTokenBalance,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.Enough,
    };
  }

  const gasPaymentTokenBalance = getBalanceByBalanceType(gasPaymentToken, balanceType);

  if (gasPaymentTokenBalance === undefined || gasPaymentTokenAmount === undefined) {
    return {
      maxAvailableAmount: 0n,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.NotAvailable,
    };
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

  let safeBuffer = bigMath.clamp(
    gasPaymentTokenAmount * RESIDUAL_GAS_AMOUNT_MULTIPLIER,
    minResidualAmount,
    maxResidualAmount
  );

  if (safeBuffer + gasPaymentTokenAmount <= gasPaymentTokenBalance) {
    return {
      maxAvailableAmount: gasPaymentTokenBalance - safeBuffer - gasPaymentTokenAmount,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.Enough,
    };
  }

  const minimalBuffer = applyValidMinimalBuffer(gasPaymentTokenAmount);
  if (gasPaymentTokenBalance >= minimalBuffer) {
    return {
      maxAvailableAmount: gasPaymentTokenBalance - minimalBuffer,
      maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.MinimalBuffer,
    };
  }

  return { maxAvailableAmount: 0n, maxAvailableAmountStatus: GasPaymentTokenMaxAvailabilityStatus.NotEnough };
}
