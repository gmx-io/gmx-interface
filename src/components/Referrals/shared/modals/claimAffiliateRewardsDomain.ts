import { AffiliateReward } from "domain/synthetics/referrals/types";
import type { ContractsChainId } from "sdk/configs/chains";
import { getMarketIsSameCollaterals, getTokenAddressByMarket } from "sdk/configs/markets";

export type RewardsParams = {
  marketAddresses: string[];
  tokenAddresses: string[];
};

export type SelectedClaimTokenAmount = {
  tokenAddress: string;
  amount: bigint;
};

export function buildRewardsParams(
  chainId: ContractsChainId,
  rewards: AffiliateReward[],
  selectedMarketAddresses: string[]
): RewardsParams {
  const selectedRewards = rewards.filter((reward) => selectedMarketAddresses.includes(reward.marketAddress));
  const marketAddresses: string[] = [];
  const tokenAddresses: string[] = [];

  for (const reward of selectedRewards) {
    const isSameCollaterals = getMarketIsSameCollaterals(chainId, reward.marketAddress);

    if (reward.longTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "long"));
    }

    if (!isSameCollaterals && reward.shortTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "short"));
    }
  }

  return {
    marketAddresses,
    tokenAddresses,
  };
}

export function getSelectedClaimTokenAmounts({
  chainId,
  rewards,
  selectedMarketAddresses,
}: {
  chainId: ContractsChainId;
  rewards: AffiliateReward[];
  selectedMarketAddresses: string[];
}): Record<string, SelectedClaimTokenAmount> {
  const amountsByToken: Record<string, SelectedClaimTokenAmount> = {};

  for (const reward of rewards) {
    if (!selectedMarketAddresses.includes(reward.marketAddress)) {
      continue;
    }

    const isSameCollaterals = getMarketIsSameCollaterals(chainId, reward.marketAddress);
    const longTokenAddress = getTokenAddressByMarket(chainId, reward.marketAddress, "long");

    if (reward.longTokenAmount > 0) {
      if (!amountsByToken[longTokenAddress]) {
        amountsByToken[longTokenAddress] = { tokenAddress: longTokenAddress, amount: 0n };
      }

      amountsByToken[longTokenAddress].amount += reward.longTokenAmount;
    }

    const shortTokenAddress = getTokenAddressByMarket(chainId, reward.marketAddress, "short");
    if (!isSameCollaterals && reward.shortTokenAmount > 0) {
      if (!amountsByToken[shortTokenAddress]) {
        amountsByToken[shortTokenAddress] = { tokenAddress: shortTokenAddress, amount: 0n };
      }

      amountsByToken[shortTokenAddress].amount += reward.shortTokenAmount;
    }
  }

  return amountsByToken;
}
