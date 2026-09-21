import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIndexerUrl } from "config/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

type UserStatsData = {
  userStats: {
    uniqueCountCumulative: number;
  }[];
};

type UniqueUsersByChain = Record<number | "total", number>;

const UNIQUE_USERS_QUERY = `
  query UniqueUsers {
    userStats(where: {period: total}) {
      uniqueCountCumulative
    }
  }
`;

export default function useUniqueUsers() {
  return useSWRWithFreshness(
    "uniqueUsers",
    async (): Promise<UniqueUsersByChain> => {
      const results = await Promise.all(
        ACTIVE_CHAIN_IDS.map(async (chainId) => {
          const endpoint = getIndexerUrl(chainId, "stats");
          if (!endpoint) return undefined;
          return await graphqlFetcher<UserStatsData>(endpoint, UNIQUE_USERS_QUERY);
        })
      );

      return results.reduce(
        (acc, userInfo, index) => {
          const currentChainUsers = userInfo?.userStats?.[0]?.uniqueCountCumulative ?? 0;
          acc[ACTIVE_CHAIN_IDS[index]] = currentChainUsers;
          acc.total += currentChainUsers;
          return acc;
        },
        { total: 0 } as UniqueUsersByChain
      );
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );
}
