import { zeroAddress } from "viem";

import type { ExpressTxnParams, GasPaymentParams } from "domain/synthetics/express";
import {
  PositionInfo,
  getIsPositionBelowMinCollateralForLeverage,
  getIsPositionInfoLoaded,
} from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import type { TokensData } from "domain/tokens";
import { applyMinimalBuffer } from "domain/tokens/useMaxAvailableAmount";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getIsConfirmedOutOfGasPaymentTokenBalance } from "sdk/utils/express";

const PENDING_FUNDING_FEE_THRESHOLD = 10n * 10n ** 30n; // 10$
const SETTLE_FEE_RATIO_THRESHOLD = 10n;

export const SETTLEMENT_COLLATERAL_DELTA_AMOUNT = 1n;

export type SettlementBlockReason = "negativeMargin" | "belowMinCollateral";

export function getSettlementBlockReason(
  position: PositionInfo,
  minCollateralUsd: bigint | undefined
): SettlementBlockReason | undefined {
  if (position.remainingCollateralUsd < 0n) {
    return "negativeMargin";
  }

  if (!getIsPositionInfoLoaded(position)) {
    return undefined;
  }

  if (getIsPositionBelowMinCollateralForLeverage(position, SETTLEMENT_COLLATERAL_DELTA_AMOUNT)) {
    return "belowMinCollateral";
  }

  const collateralUsdAfterSettlement = convertToUsd(
    position.collateralAmount - SETTLEMENT_COLLATERAL_DELTA_AMOUNT,
    position.collateralToken.decimals,
    position.collateralToken.prices.minPrice
  )!;

  if (minCollateralUsd !== undefined && collateralUsdAfterSettlement + position.pnl < minCollateralUsd) {
    return "belowMinCollateral";
  }

  return undefined;
}

export function getIsPositionSettleable(position: PositionInfo, minCollateralUsd: bigint | undefined) {
  return !position.marketInfo?.isDisabled && getSettlementBlockReason(position, minCollateralUsd) === undefined;
}

export function shouldPreSelectPosition(
  position: PositionInfo,
  networkFee: bigint,
  minCollateralUsd: bigint | undefined
) {
  const { pendingClaimableFundingFeesUsd } = position;

  return (
    getIsPositionSettleable(position, minCollateralUsd) &&
    pendingClaimableFundingFeesUsd > PENDING_FUNDING_FEE_THRESHOLD &&
    pendingClaimableFundingFeesUsd > networkFee * SETTLE_FEE_RATIO_THRESHOLD
  );
}

export function getCanPayNetworkFeeFromBalance({
  chainId,
  tokensData,
  gasPaymentParams,
  isGmxAccount,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  gasPaymentParams: GasPaymentParams;
  isGmxAccount: boolean;
}): boolean {
  const { gasPaymentToken, gasPaymentTokenAmount } = gasPaymentParams;
  const feeUsd = convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);
  if (feeUsd === undefined) return false;

  return getGasPaymentTokens(chainId).some((tokenAddress) => {
    const token = getByKey(tokensData, tokenAddress);
    if (!token) return false;

    const balance = isGmxAccount ? token.gmxAccountBalance : token.walletBalance;
    const required = convertToTokenAmount(feeUsd, token.decimals, token.prices.minPrice);
    if (balance === undefined || required === undefined) return false;

    return balance >= applyMinimalBuffer(required);
  });
}

export function getShouldSwitchNetworkFeeSource({
  chainId,
  tokensData,
  expressParams,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  expressParams: ExpressTxnParams;
}): boolean {
  if (!getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations)) return false;

  const { isGmxAccount, gasPaymentParams } = expressParams;
  const canPay = (fromGmxAccount: boolean) =>
    getCanPayNetworkFeeFromBalance({ chainId, tokensData, gasPaymentParams, isGmxAccount: fromGmxAccount });

  if (canPay(isGmxAccount)) return false;
  if (canPay(!isGmxAccount)) return true;
  if (!isGmxAccount) return false;

  const nativeBalance = getByKey(tokensData, zeroAddress)?.walletBalance;
  return nativeBalance !== undefined && nativeBalance >= gasPaymentParams.totalRelayerFeeTokenAmount;
}
