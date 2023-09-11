import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
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
        totalUsers: BigNumber.from(userStats[0].uniqueUsers),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching usersInfo data for chain ${chainId}:`, error);
      return {
        totalUsers: BigNumber.from(0),
      };
    }
  }

  async function fetcher([_, chainId]) {
    try {
      const { totalUsers } = await fetchUsersInfo(chainId);
      return {
        totalUsers,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching usersInfo data:", error);
      return {
        totalUsers: BigNumber.from(0),
      };
    }
  }

  const { data: feesInfo } = useSWR(["v2UsersInfo", chainId], fetcher, {
    refreshInterval: 60000,
  });

  return feesInfo;
}
