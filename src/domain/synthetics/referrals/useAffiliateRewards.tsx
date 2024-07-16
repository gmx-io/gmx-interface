import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { affiliateRewardKey } from "config/dataStore";
import { useMarkets } from "domain/synthetics/markets";
import { useMulticall } from "lib/multicall";
import { AffiliateRewardsData } from "./types";
import useWallet from "lib/wallets/useWallet";

export type AffiliateRewardsResult = {
  affiliateRewardsData?: AffiliateRewardsData;
};

export function useAffiliateRewards(chainId: number) {
  const { account } = useWallet();
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const { data } = useMulticall(chainId, "useAffiliateRewards", {
    key: account && marketsAddresses?.length ? [account, marketsAddresses.join("-")] : null,
    request: () => {
      return {
        dataStore: {
          contractAddress: getContract(chainId, "DataStore"),
          abi: DataStore.abi,
          calls: marketsAddresses!.reduce((acc, marketAddress) => {
            const market = marketsData![marketAddress];

            acc[`${marketAddress}-${market.longTokenAddress}`] = {
              methodName: "getUint",
              params: [affiliateRewardKey(marketAddress, market.longTokenAddress, account!)],
            };

            acc[`${marketAddress}-${market.shortTokenAddress}`] = {
              methodName: "getUint",
              params: [affiliateRewardKey(marketAddress, market.shortTokenAddress, account!)],
            };

            return acc;
          }, {}),
        },
      };
    },
    parseResponse: (res) => {
      const result: AffiliateRewardsData = {};

      marketsAddresses!.forEach((marketAddress) => {
        const market = marketsData![marketAddress];
        const longTokenAmount = res.data.dataStore[`${marketAddress}-${market.longTokenAddress}`].returnValues[0];
        const shortTokenAmount = res.data.dataStore[`${marketAddress}-${market.shortTokenAddress}`].returnValues[0];

        result[marketAddress] = {
          marketAddress,
          longTokenAmount,
          shortTokenAmount,
        };
      });

      return result;
    },
  });

  return {
    affiliateRewardsData: data,
  };
}
