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

type UsersInfo = {
  totalUsers: BigNumber;
};

export default function useUsers(chains: number[]) {
  async function fetchUsersInfo(chain: number) {
    try {
      const client = getSyntheticsGraphClient(chain);
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
      console.error(`Error fetching usersInfo data for chain ${chain}:`, error);
      return {
        totalUsers: BigNumber.from(0),
      };
    }
  }

  async function fetcher() {
    try {
      const promises = chains.map(fetchUsersInfo);
      const results = await Promise.allSettled(promises);
      const fees = results
        .filter((result) => result.status === "fulfilled")
        .reduce((acc, result, index) => {
          const value = (result as PromiseFulfilledResult<UsersInfo>).value;
          acc[chains[index]] = value;
          return acc;
        }, {});
      return fees;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching feesInfo data:", error);
      return {
        totalUsers: BigNumber.from(0),
      };
    }
  }

  const { data: feesInfo } = useSWR("usersInfo", fetcher, {
    refreshInterval: 60000,
  });

  return feesInfo;
}
