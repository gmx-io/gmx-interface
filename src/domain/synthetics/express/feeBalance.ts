import { zeroAddress } from "viem";

import type { TokensData } from "domain/tokens";
import { getByKey } from "lib/objects";
import { getIsValidExpressParams } from "sdk/utils/express";
import type { Order } from "sdk/utils/orders/types";

import type { ExpressTxnParams } from "./types";

export type FeeBalanceExpressParams = {
  isGmxAccount: boolean;
  expressParams: ExpressTxnParams | undefined;
};

export type FeeBalanceEstimate = {
  expressParams: ExpressTxnParams | undefined;
  isSettled: boolean;
};

export type FeeBalanceDecision = {
  shouldEstimateOtherBalance: boolean;
  payer: "own" | "other" | undefined;
};

export function getIsGmxAccountOrder(order: Pick<Order, "srcChainId">): boolean {
  return order.srcChainId !== 0n;
}

export function getIsPositionActionGmxAccount({
  srcChainId,
  isExpressEnabled,
  positionLastSrcChainId,
}: {
  srcChainId: number | undefined;
  isExpressEnabled: boolean;
  positionLastSrcChainId: bigint | undefined;
}): boolean {
  if (srcChainId !== undefined) {
    return true;
  }

  return isExpressEnabled && positionLastSrcChainId !== undefined && positionLastSrcChainId !== 0n;
}

export function getOrdersActionFeeBalance({
  srcChainId,
  isExpressEnabled,
  orders,
}: {
  srcChainId: number | undefined;
  isExpressEnabled: boolean;
  orders: Pick<Order, "srcChainId">[];
}): { isGmxAccount: boolean; canUseOtherBalance: boolean } {
  if (srcChainId !== undefined) {
    return { isGmxAccount: true, canUseOtherBalance: false };
  }

  return {
    isGmxAccount: isExpressEnabled && orders.some(getIsGmxAccountOrder),
    canUseOtherBalance: isExpressEnabled,
  };
}

export function getCanBalancePayExpressFee({
  isGmxAccount,
  expressParams,
  tokensData,
}: {
  isGmxAccount: boolean;
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
}): boolean {
  if (expressParams && getIsValidExpressParams(expressParams)) {
    return true;
  }

  if (isGmxAccount) {
    return false;
  }

  const nativeTokenBalance = getByKey(tokensData, zeroAddress)?.walletBalance;

  if (nativeTokenBalance === undefined) {
    return true;
  }

  return expressParams
    ? nativeTokenBalance >= expressParams.gasPaymentParams.totalRelayerFeeTokenAmount
    : nativeTokenBalance > 0n;
}

export function getFeeBalanceDecision({
  isGmxAccount,
  canUseOtherBalance,
  own,
  other,
  tokensData,
}: {
  isGmxAccount: boolean;
  canUseOtherBalance: boolean;
  own: FeeBalanceEstimate;
  other: FeeBalanceEstimate | undefined;
  tokensData: TokensData | undefined;
}): FeeBalanceDecision {
  if (!own.isSettled) {
    return { shouldEstimateOtherBalance: false, payer: undefined };
  }

  if (
    !canUseOtherBalance ||
    getCanBalancePayExpressFee({ isGmxAccount, expressParams: own.expressParams, tokensData })
  ) {
    return { shouldEstimateOtherBalance: false, payer: "own" };
  }

  if (!other?.isSettled) {
    return { shouldEstimateOtherBalance: true, payer: undefined };
  }

  const canOtherPay = getCanBalancePayExpressFee({
    isGmxAccount: !isGmxAccount,
    expressParams: other.expressParams,
    tokensData,
  });

  return { shouldEstimateOtherBalance: true, payer: canOtherPay ? "other" : "own" };
}

export async function estimateWithOtherFeeBalanceFallback({
  isGmxAccount,
  canUseOtherBalance,
  tokensData,
  estimate,
}: {
  isGmxAccount: boolean;
  canUseOtherBalance: boolean;
  tokensData: TokensData | undefined;
  estimate: (isGmxAccount: boolean) => Promise<ExpressTxnParams | undefined>;
}): Promise<FeeBalanceExpressParams> {
  const own = { expressParams: await estimate(isGmxAccount), isSettled: true };
  const ownDecision = getFeeBalanceDecision({ isGmxAccount, canUseOtherBalance, own, other: undefined, tokensData });

  if (!ownDecision.shouldEstimateOtherBalance) {
    return { isGmxAccount, expressParams: own.expressParams };
  }

  const other = { expressParams: await estimate(!isGmxAccount), isSettled: true };
  const decision = getFeeBalanceDecision({ isGmxAccount, canUseOtherBalance, own, other, tokensData });

  return decision.payer === "other"
    ? { isGmxAccount: !isGmxAccount, expressParams: other.expressParams }
    : { isGmxAccount, expressParams: own.expressParams };
}
