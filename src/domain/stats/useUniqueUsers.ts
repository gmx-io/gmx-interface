import { ARBITRUM, AVALANCHE } from "config/chains";
import { getSubgraphUrl } from "config/subgraph";
import graphqlFetcher from "lib/graphqlFetcher";
import useSWR from "swr";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

type UserStatsData = {
  userStats: {
    uniqueCountCumulative: number;
  }[];
};

const UNIQUE_USERS_QUERY = `
  query UniqueUsers {
    userStats(where: {period: total}) {
      uniqueCountCumulative
    }
  }
`;

export default function useUniqueUsers() {
  const { data } = useSWR(
    "uniqueUsers",
    async () => {
      const results = await Promise.all(
        ACTIVE_CHAIN_IDS.map(async (chainId) => {
          const endpoint = getSubgraphUrl(chainId, "stats");
          if (!endpoint) return undefined;
          return await graphqlFetcher<UserStatsData>(endpoint, UNIQUE_USERS_QUERY);
        })
      );
      return results;
    },
    {
      refreshInterval: 60000,
    }
  );

  return data?.reduce(
    (acc, userInfo, index) => {
      const currentChainUsers = userInfo?.userStats?.[0]?.uniqueCountCumulative ?? 0;
      acc[ACTIVE_CHAIN_IDS[index]] = currentChainUsers;
      acc.total += currentChainUsers;
      return acc;
    },
    {
      total: 0,
    }
  );
}
