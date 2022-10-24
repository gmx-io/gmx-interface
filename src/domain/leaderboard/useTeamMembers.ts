import { gql } from "@apollo/client";
import { ethers } from "ethers";
import { useState } from "react";
import useSWR from "swr";
import { getTeamMembers } from "./contracts";
import { getGraphClient } from "./graph";

export type TeamMembersStats = {
  address: string;
  pnl: number;
};

export function useTeamMembersStats(chainId, library, competitionIndex, leaderAddress, page, perPage) {
  const [data, setData] = useState<TeamMembersStats[]>([]);
  const [loading, setLoading] = useState(true);

  const query = gql`
    query ($team: String!, $perPage: Int!, $skip: Int!) {
      accountStats(first: $perPage, skip: $skip, orderBy: pnl, orderByDir: desc, where: { team: $team }) {
        account {
          address
        }
        pnl
      }
    }
  `;

  const { revalidate } = useSWR([chainId, library, competitionIndex, leaderAddress, page, perPage], () => {
    async function main() {
      if (competitionIndex === null) {
        setData([]);
        setLoading(false);
        return;
      }

      let addresses: string[] = [];
      let loadedFromChain = false;

      if (chainId && library) {
        try {
          addresses = await getTeamMembers(chainId, library, competitionIndex, leaderAddress);
          loadedFromChain = true;
        } catch (err) {
          console.error(err);
        }
      }

      const res = await getGraphClient(chainId).query({
        query,
        variables: {
          team: competitionIndex + "-" + leaderAddress.toLowerCase(),
          perPage: Number(perPage),
          skip: Number((page - 1) * perPage),
        },
      });

      const stats: TeamMembersStats[] = res.data.accountStats.map((stat) => ({
        address: ethers.utils.getAddress(stat.account.address),
        pnl: Number(stat.pnl),
        pnlPercent: Number(stat.pnlPercent),
      }));

      let finalData: TeamMembersStats[] = [];

      if (loadedFromChain) {
        addresses.forEach((addr) => {
          const addrStat = stats.find((stat) => stat.address === addr);
          finalData.push({
            address: addr,
            pnl: addrStat ? addrStat.pnl : 0,
          });
        });
      } else {
        finalData = stats;
      }

      setData(finalData);
      setLoading(false);
    }

    main();
  });

  return { data, loading, revalidate };
}
