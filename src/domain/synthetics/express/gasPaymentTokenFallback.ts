import { getNeedTokenApprove, type TokensAllowanceData } from "domain/synthetics/tokens";
import { convertToTokenAmount, type SignedTokenPermit, type TokenData, type TokensData } from "domain/tokens";
import { applyMinimalBuffer } from "domain/tokens/useMaxAvailableAmount";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getIsValidExpressParams } from "sdk/utils/express";

import type { ExpressTxnParams, GlobalExpressParams } from "./types";
import { findNextGasPaymentToken } from "./useSwitchGasPaymentTokenIfRequired";

/**
 * - payToken: when the saved gas payment token needs an approval, pay the fee in the pay token
 * - approvedToken: when the saved gas payment token needs an approval or is short, pay the fee
 *   in another already approved gas payment token with enough balance
 */
export type GasPaymentTokenFallback = "payToken" | "approvedToken";

function getFeeTokenAmount(feeUsd: bigint | undefined, token: TokenData) {
  return feeUsd !== undefined ? convertToTokenAmount(feeUsd, token.decimals, token.prices.minPrice) : undefined;
}

export function resolveGasPaymentTokenAddress({
  chainId,
  fallback,
  gasPaymentToken,
  payTokenAddress,
  payAmounts,
  feeUsdByToken,
  tokensData,
  tokensAllowanceData,
  tokenPermits,
}: {
  chainId: number;
  fallback: GasPaymentTokenFallback;
  gasPaymentToken: TokenData;
  payTokenAddress: string | undefined;
  payAmounts: Record<string, bigint>;
  // Latest fee estimated with each token; a token's entry only changes while the fee is paid with it
  feeUsdByToken: Record<string, bigint>;
  tokensData: TokensData | undefined;
  tokensAllowanceData: TokensAllowanceData | undefined;
  tokenPermits: SignedTokenPermit[];
}): string {
  const gasPaymentTokenAddress = gasPaymentToken.address;

  if (tokensAllowanceData?.[gasPaymentTokenAddress] === undefined) {
    return gasPaymentTokenAddress;
  }

  const feeAmount = getFeeTokenAmount(feeUsdByToken[gasPaymentTokenAddress], gasPaymentToken);
  // Without a fee estimate yet, only a zero allowance or balance is known to be insufficient
  const requiredAmount =
    (payAmounts[gasPaymentTokenAddress] ?? 0n) + (feeAmount !== undefined ? applyMinimalBuffer(feeAmount) : 1n);
  const needsApproval = getNeedTokenApprove(tokensAllowanceData, gasPaymentTokenAddress, requiredAmount, tokenPermits);

  if (fallback === "payToken") {
    if (
      !needsApproval ||
      payTokenAddress === undefined ||
      payTokenAddress === gasPaymentTokenAddress ||
      !getGasPaymentTokens(chainId).includes(payTokenAddress)
    ) {
      return gasPaymentTokenAddress;
    }

    const payToken = getByKey(tokensData, payTokenAddress);
    const payTokenBalance = payToken?.walletBalance;
    if (!payToken || payTokenBalance === undefined || payTokenBalance === 0n) {
      return gasPaymentTokenAddress;
    }

    const payTokenFeeAmount = getFeeTokenAmount(feeUsdByToken[payTokenAddress], payToken);
    if (payTokenFeeAmount !== undefined && applyMinimalBuffer(payTokenFeeAmount) > payTokenBalance) {
      return gasPaymentTokenAddress;
    }

    return payTokenAddress;
  }

  const balance = gasPaymentToken.walletBalance;
  const isShort = balance !== undefined && requiredAmount > balance;

  if ((!needsApproval && !isShort) || feeAmount === undefined) {
    return gasPaymentTokenAddress;
  }

  return (
    findNextGasPaymentToken({
      chainId,
      tokensData,
      gasPaymentToken,
      gasPaymentTokenAmount: feeAmount,
      payAmounts,
      isGmxAccount: false,
      tokensAllowanceData,
    }) ?? gasPaymentTokenAddress
  );
}

export async function estimateWithApprovedGasPaymentToken({
  chainId,
  isGmxAccount,
  globalExpressParams,
  payAmounts,
  estimate,
  getGlobalExpressParamsForGasPaymentToken,
}: {
  chainId: number;
  isGmxAccount: boolean;
  globalExpressParams: GlobalExpressParams | undefined;
  payAmounts: Record<string, bigint>;
  estimate: (globalExpressParams: GlobalExpressParams | undefined) => Promise<ExpressTxnParams | undefined>;
  getGlobalExpressParamsForGasPaymentToken: (gasPaymentTokenAddress: string) => GlobalExpressParams | undefined;
}): Promise<ExpressTxnParams | undefined> {
  const expressParams = await estimate(globalExpressParams);

  if (isGmxAccount || !globalExpressParams || !expressParams || getIsValidExpressParams(expressParams)) {
    return expressParams;
  }

  const nextGasPaymentTokenAddress = findNextGasPaymentToken({
    chainId,
    tokensData: globalExpressParams.tokensData,
    gasPaymentToken: expressParams.gasPaymentParams.gasPaymentToken,
    gasPaymentTokenAmount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
    payAmounts,
    isGmxAccount: false,
    tokensAllowanceData: globalExpressParams.gasPaymentAllowanceData,
  });

  const nextGlobalExpressParams = nextGasPaymentTokenAddress
    ? getGlobalExpressParamsForGasPaymentToken(nextGasPaymentTokenAddress)
    : undefined;

  if (!nextGlobalExpressParams) {
    return expressParams;
  }

  const nextExpressParams = await estimate(nextGlobalExpressParams);

  return nextExpressParams && getIsValidExpressParams(nextExpressParams) ? nextExpressParams : expressParams;
}
