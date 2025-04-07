import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getSubgraphUrl } from "config/subgraph";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

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
      refreshInterval: CONFIG_UPDATE_INTERVAL,
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
