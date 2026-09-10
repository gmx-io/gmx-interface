import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSyntheticsGraphClient } from "lib/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

const query = gql`
  query totalUsers {
    userStats(where: { id: "total" }) {
      uniqueUsers
    }
  }
`;

export default function useUsers(chainId: number) {
  async function fetchUsersInfo(chainId: number) {
    try {
      const client = getSyntheticsGraphClient(chainId);
      const { data } = await client!.query({
        query,
        fetchPolicy: "no-cache",
      });
      const { userStats } = data;
      return {
        totalUsers: BigInt(userStats[0].uniqueUsers),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching usersInfo data for chain ${chainId}:`, error);
      // a failed source stays unknown: a zero here would settle the network total as complete
      return undefined;
    }
  }

  async function fetcher([, chainId]: [string, number]) {
    return fetchUsersInfo(chainId);
  }

  const { data: feesInfo } = useSWR(["v2UsersInfo", chainId], fetcher, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return feesInfo;
}
