import { InfoTokens, SignedTokenPermit, TokenBalanceType, TokenInfo } from "domain/tokens";
import { convertTokenAddress, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { getTokenData } from "sdk/utils/tokens";

import { TokenData, TokensAllowanceData, TokensData, TokenToSpendParams } from "./types";

export * from "sdk/utils/tokens";

export function getNeedTokenApprove(
  tokenAllowanceData: TokensAllowanceData | undefined,
  tokenAddress: string | undefined,
  amountToSpend: bigint | undefined,
  permits: SignedTokenPermit[]
): boolean {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS || amountToSpend === undefined || amountToSpend <= 0n) {
    return false;
  }

  if (!tokenAllowanceData || !tokenAddress || tokenAllowanceData?.[tokenAddress] === undefined) {
    return true;
  }

  const shouldApprove = amountToSpend > tokenAllowanceData[tokenAddress];
  const signedPermit = permits.find(
    (permit) =>
      permit.token === tokenAddress && BigInt(permit.value) >= amountToSpend && Number(permit.deadline) > nowInSeconds()
  );

  return shouldApprove && !signedPermit;
}

export function getApprovalRequirements({
  chainId,
  payTokenParamsList,
  gasPaymentTokenParams,
  permits,
}: {
  chainId: number;
  payTokenParamsList: TokenToSpendParams[];
  gasPaymentTokenParams: TokenToSpendParams | undefined;
  permits: SignedTokenPermit[];
}): {
  tokensToApprove: TokenToSpendParams[];
  isAllowanceLoaded: boolean;
} {
  const initialTokensToApprove = payTokenParamsList;

  if (gasPaymentTokenParams) {
    initialTokensToApprove.push(gasPaymentTokenParams);
  }

  const combinedTokensToSpendMap = initialTokensToApprove.reduce(
    (acc, curr) => {
      const tokenAddress = convertTokenAddress(chainId, curr.tokenAddress, "wrapped");

      if (acc[tokenAddress] !== undefined) {
        acc[tokenAddress].amount = acc[tokenAddress].amount + curr.amount;
      } else {
        acc[tokenAddress] = {
          ...curr,
        };
      }

      return acc;
    },
    {} as Record<string, TokenToSpendParams>
  );

  const tokensToApprove = Object.values(combinedTokensToSpendMap).filter((tokenToSpend) => {
    return getNeedTokenApprove(tokenToSpend.allowanceData, tokenToSpend.tokenAddress, tokenToSpend.amount, permits);
  });

  const isAllowanceLoaded = tokensToApprove.every((tokenToSpend) => tokenToSpend.isAllowanceLoaded);

  return {
    tokensToApprove,
    isAllowanceLoaded,
  };
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToV1InfoTokens(tokensData: TokensData): InfoTokens {
  const infoTokens = Object.keys(tokensData).reduce((acc, address) => {
    const tokenData = getTokenData(tokensData, address)!;

    acc[address] = adaptToV1TokenInfo(tokenData);

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToV1TokenInfo(tokenData: TokenData): TokenInfo {
  return {
    ...tokenData,
    minPrice: tokenData.prices?.minPrice,
    maxPrice: tokenData.prices?.maxPrice,
  };
}

export function getBalanceByBalanceType(tokenData: TokenData, tokenBalanceType: TokenBalanceType): bigint | undefined {
  switch (tokenBalanceType) {
    case TokenBalanceType.Wallet:
      return tokenData.walletBalance;
    case TokenBalanceType.GmxAccount:
      return tokenData.gmxAccountBalance;
    case TokenBalanceType.SourceChain:
      return tokenData.sourceChainBalance;
  }
}
