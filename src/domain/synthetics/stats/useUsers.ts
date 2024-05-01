import { gql } from "@apollo/client";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

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
      return {
        totalUsers: 0n,
      };
    }
  }

  async function fetcher([, chainId]) {
    try {
      const { totalUsers } = await fetchUsersInfo(chainId);
      return {
        totalUsers,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching usersInfo data:", error);
      return {
        totalUsers: 0n,
      };
    }
  }

  const { data: feesInfo } = useSWR(["v2UsersInfo", chainId], fetcher, {
    refreshInterval: 60000,
  });

  return feesInfo;
}
