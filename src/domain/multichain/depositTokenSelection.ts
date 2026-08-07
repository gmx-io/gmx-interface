import { isGmxAccountHoldableToken } from "config/markets";
import type { TokenData, TokensData } from "domain/tokens";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import type { SettlementChainId } from "sdk/configs/chains";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

export function isDepositableFromWallet(
  chainId: SettlementChainId,
  tokenData: TokenData | undefined
): tokenData is TokenData {
  return (
    tokenData !== undefined &&
    tokenData.walletBalance !== undefined &&
    tokenData.walletBalance > 0n &&
    isGmxAccountHoldableToken(chainId, tokenData.address)
  );
}

export function resolveSettlementChainDepositToken({
  chainId,
  tokensData,
  selectedTokenAddress,
  preferredTokenAddress,
}: {
  chainId: SettlementChainId;
  tokensData: TokensData | undefined;
  selectedTokenAddress: string | undefined;
  preferredTokenAddress: string | undefined;
}): string | undefined {
  if (
    selectedTokenAddress !== undefined &&
    isDepositableFromWallet(chainId, getByKey(tokensData, selectedTokenAddress))
  ) {
    return selectedTokenAddress;
  }

  if (
    preferredTokenAddress !== undefined &&
    isDepositableFromWallet(chainId, getByKey(tokensData, preferredTokenAddress))
  ) {
    return preferredTokenAddress;
  }

  let maxBalanceTokenAddress: string | undefined = undefined;
  let maxBalanceUsd: bigint | undefined = undefined;

  for (const tokenData of Object.values(tokensData ?? (EMPTY_OBJECT as TokensData))) {
    if (!isDepositableFromWallet(chainId, tokenData)) {
      continue;
    }

    const balanceUsd = convertToUsd(tokenData.walletBalance, tokenData.decimals, getMidPrice(tokenData.prices));

    if (balanceUsd !== undefined && (maxBalanceUsd === undefined || balanceUsd > maxBalanceUsd)) {
      maxBalanceTokenAddress = tokenData.address;
      maxBalanceUsd = balanceUsd;
    }
  }

  return maxBalanceTokenAddress;
}
