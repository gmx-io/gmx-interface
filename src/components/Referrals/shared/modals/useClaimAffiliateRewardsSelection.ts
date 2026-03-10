import partition from "lodash/partition";
import { useCallback, useMemo, useState } from "react";

import {
  MarketsInfoData,
} from "domain/synthetics/markets";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { convertToUsd } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import type { ContractsChainId } from "sdk/configs/chains";
import { getTokenAddressByMarket } from "sdk/configs/markets";

export type RewardsParams = {
  marketAddresses: string[];
  tokenAddresses: string[];
};

export type SelectedClaimTokenAmount = {
  tokenAddress: string;
  amount: bigint;
  usd: bigint;
};

const MIN_REWARD_USD_THRESHOLD = expandDecimals(1, 30); // $1 in USD_DECIMALS

export function getRewardUsd(reward: AffiliateReward, marketsInfoData: MarketsInfoData | undefined): bigint {
  const marketInfo = marketsInfoData ? getByKey(marketsInfoData, reward.marketAddress) : undefined;
  if (!marketInfo) {
    return 0n;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const { longTokenAmount, shortTokenAmount } = reward;

  const longRewardUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;
  let totalReward = longRewardUsd;

  if (!isSameCollaterals) {
    const shortRewardUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;
    totalReward += shortRewardUsd;
  }

  return totalReward;
}

function buildRewardsParams(chainId: ContractsChainId, rewards: AffiliateReward[], selectedMarketAddresses: string[]) {
  const selectedRewards = rewards.filter((reward) => selectedMarketAddresses.includes(reward.marketAddress));
  const marketAddresses: string[] = [];
  const tokenAddresses: string[] = [];

  for (const reward of selectedRewards) {
    if (reward.longTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "long"));
    }

    if (reward.shortTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "short"));
    }
  }

  return {
    marketAddresses,
    tokenAddresses,
  };
}

function getSelectedClaimTokenAmounts({
  chainId,
  rewards,
  selectedMarketAddresses,
  marketsInfoData,
}: {
  chainId: ContractsChainId;
  rewards: AffiliateReward[];
  selectedMarketAddresses: string[];
  marketsInfoData: MarketsInfoData | undefined;
}): Record<string, SelectedClaimTokenAmount> {
  const amountsByToken: Record<string, SelectedClaimTokenAmount> = {};

  for (const reward of rewards) {
    if (!selectedMarketAddresses.includes(reward.marketAddress)) {
      continue;
    }

    const marketInfo = getByKey(marketsInfoData, reward.marketAddress);
    if (!marketInfo) {
      continue;
    }

    const longTokenAddress = getTokenAddressByMarket(chainId, reward.marketAddress, "long");
    const longRewardUsd = convertToUsd(
      reward.longTokenAmount,
      marketInfo.longToken.decimals,
      marketInfo.longToken.prices.minPrice
    );

    if (reward.longTokenAmount > 0) {
      if (!amountsByToken[longTokenAddress]) {
        amountsByToken[longTokenAddress] = { tokenAddress: longTokenAddress, amount: 0n, usd: 0n };
      }

      amountsByToken[longTokenAddress].amount += reward.longTokenAmount;
      amountsByToken[longTokenAddress].usd += longRewardUsd ?? 0n;
    }

    const shortTokenAddress = getTokenAddressByMarket(chainId, reward.marketAddress, "short");
    const shortRewardUsd = convertToUsd(
      reward.shortTokenAmount,
      marketInfo.shortToken.decimals,
      marketInfo.shortToken.prices.minPrice
    );

    if (!marketInfo.isSameCollaterals && reward.shortTokenAmount > 0) {
      if (!amountsByToken[shortTokenAddress]) {
        amountsByToken[shortTokenAddress] = { tokenAddress: shortTokenAddress, amount: 0n, usd: 0n };
      }

      amountsByToken[shortTokenAddress].amount += reward.shortTokenAmount;
      amountsByToken[shortTokenAddress].usd += shortRewardUsd ?? 0n;
    }
  }

  return amountsByToken;
}

export function useClaimAffiliateRewardsSelection({
  chainId,
  rewards,
  marketsInfoData,
}: {
  chainId: ContractsChainId;
  rewards: AffiliateReward[];
  marketsInfoData: MarketsInfoData | undefined;
}) {
  const visibleRewards = useMemo(
    () => rewards.filter((reward) => reward.longTokenAmount > 0 || reward.shortTokenAmount > 0),
    [rewards]
  );

  const { mainRewards, smallRewards } = useMemo(() => {
    const withUsd = visibleRewards
      .map((reward) => ({ reward, usd: getRewardUsd(reward, marketsInfoData) }))
      .filter(({ usd }) => usd > 0n)
      .sort((a, b) => (a.usd > b.usd ? -1 : a.usd < b.usd ? 1 : 0));

    const [main, small] = partition(withUsd, ({ usd }) => usd > MIN_REWARD_USD_THRESHOLD);
    return {
      mainRewards: main.map(({ reward }) => reward),
      smallRewards: small.map(({ reward }) => reward),
    };
  }, [visibleRewards, marketsInfoData]);

  const [showSmallRewards, setShowSmallRewards] = useState(false);
  const [selectedMarketAddresses, setSelectedMarketAddresses] = useState<string[]>([]);

  const handleToggleSelect = useCallback((marketAddress: string) => {
    setSelectedMarketAddresses((prev) => {
      if (prev.includes(marketAddress)) {
        return prev.filter((address) => address !== marketAddress);
      }
      return [...prev, marketAddress];
    });
  }, []);

  const rewardsParams = useMemo(
    () => buildRewardsParams(chainId, rewards, selectedMarketAddresses),
    [chainId, rewards, selectedMarketAddresses]
  );

  const selectedClaimTokenAmountsByToken = useMemo(
    () =>
      getSelectedClaimTokenAmounts({
        chainId,
        rewards,
        selectedMarketAddresses,
        marketsInfoData,
      }),
    [chainId, marketsInfoData, rewards, selectedMarketAddresses]
  );

  const selectedClaimTokenAmounts = useMemo(
    () => Object.values(selectedClaimTokenAmountsByToken),
    [selectedClaimTokenAmountsByToken]
  );

  const selectedClaimTokensUsd = useMemo(
    () => selectedClaimTokenAmounts.reduce((acc, item) => acc + item.usd, 0n),
    [selectedClaimTokenAmounts]
  );

  const selectableRewards = useMemo(
    () => (showSmallRewards ? [...mainRewards, ...smallRewards] : mainRewards),
    [mainRewards, showSmallRewards, smallRewards]
  );

  const isAllChecked =
    selectableRewards.length > 0 &&
    selectableRewards.every((reward) => selectedMarketAddresses.includes(reward.marketAddress));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllChecked) {
      setSelectedMarketAddresses([]);
    } else {
      setSelectedMarketAddresses(selectableRewards.map((reward) => reward.marketAddress));
    }
  }, [isAllChecked, selectableRewards]);

  return {
    mainRewards,
    smallRewards,
    showSmallRewards,
    setShowSmallRewards,
    selectedMarketAddresses,
    handleToggleSelect,
    rewardsParams,
    selectedClaimTokenAmountsByToken,
    selectedClaimTokensUsd,
    selectableRewards,
    isAllChecked,
    handleToggleSelectAll,
  };
}
