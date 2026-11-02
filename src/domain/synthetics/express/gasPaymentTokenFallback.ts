import { getNeedTokenApprove, type TokensAllowanceData } from "domain/synthetics/tokens";
import { convertToTokenAmount, type SignedTokenPermit, type TokenData, type TokensData } from "domain/tokens";
import { applyMinimalBuffer } from "domain/tokens/useMaxAvailableAmount";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getIsValidExpressParams } from "sdk/utils/express";

import type { ExpressTxnParams, GlobalExpressParams } from "./types";
import { findNextGasPaymentToken } from "./useSwitchGasPaymentTokenIfRequired";

/**
 * - skipApproval: when the saved gas payment token needs an approval, pay the fee in the pay token if one is
 *   given, otherwise in another already approved gas payment token with enough balance
 * - approvedToken: when the saved gas payment token needs an approval or is short, pay the fee
 *   in another already approved gas payment token with enough balance
 */
export type GasPaymentTokenFallback = "skipApproval" | "approvedToken";

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

  if (fallback === "skipApproval" && needsApproval) {
    // the order approves the saved token anyway when it spends it, so that approval covers the fee too
    if (payTokenAddress === gasPaymentTokenAddress || (payAmounts[gasPaymentTokenAddress] ?? 0n) > 0n) {
      return gasPaymentTokenAddress;
    }

    const payTokenFeeTokenAddress = getPayTokenFeeTokenAddress({
      chainId,
      payTokenAddress,
      feeUsdByToken,
      tokensData,
    });

    if (payTokenFeeTokenAddress !== undefined) {
      return payTokenFeeTokenAddress;
    }
  }

  const balance = gasPaymentToken.walletBalance;
  // skipApproval leaves a short saved token to the automatic switch, which saves the new token
  const isShort = fallback === "approvedToken" && balance !== undefined && requiredAmount > balance;

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
      // the pay token was checked above, and payAmounts may leave out the order amount it spends
      excludeTokenAddresses:
        fallback === "skipApproval" && payTokenAddress !== undefined ? [payTokenAddress] : undefined,
      tokensAllowanceData,
    }) ?? gasPaymentTokenAddress
  );
}

function getPayTokenFeeTokenAddress({
  chainId,
  payTokenAddress,
  feeUsdByToken,
  tokensData,
}: {
  chainId: number;
  payTokenAddress: string | undefined;
  feeUsdByToken: Record<string, bigint>;
  tokensData: TokensData | undefined;
}): string | undefined {
  if (payTokenAddress === undefined || !getGasPaymentTokens(chainId).includes(payTokenAddress)) {
    return undefined;
  }

  const payToken = getByKey(tokensData, payTokenAddress);
  const payTokenBalance = payToken?.walletBalance;
  if (!payToken || payTokenBalance === undefined || payTokenBalance === 0n) {
    return undefined;
  }

  // the order amount is left out on purpose: Max holds the fee back from the pay token, so an amount-based
  // check would flip back to the saved token right when Max is filled with the whole balance
  const payTokenFeeAmount = getFeeTokenAmount(feeUsdByToken[payTokenAddress], payToken);
  if (payTokenFeeAmount !== undefined && applyMinimalBuffer(payTokenFeeAmount) > payTokenBalance) {
    return undefined;
  }

  return payTokenAddress;
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
