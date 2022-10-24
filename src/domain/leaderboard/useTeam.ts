import { gql } from "@apollo/client";
import { ethers } from "ethers";
import { isAddressZero } from "lib/legacy";
import { useState } from "react";
import useSWR from "swr";
import { getCompetitionContract, getTeamMembers, hasCompetitionContract } from "./contracts";
import { getGraphClient } from "./graph";

export type Team = {
  rank: number;
  pnl: number;
  leaderAddress: string;
  name: string;
  members: any[];
  positions: any[];
  competitionIndex: any;
};

export function useTeam(chainId, library, competitionIndex, leaderAddress) {
  const [data, setData] = useState<Team>({
    rank: 0,
    pnl: 0,
    leaderAddress: "",
    name: "",
    members: [],
    positions: [],
    competitionIndex: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(true);

  const query = gql`
    query ($id: String!) {
      team(id: $id) {
        id
        name
        pnl
        members {
          address
        }
      }
    }
  `;

  const { revalidate } = useSWR([chainId, competitionIndex, leaderAddress, query, library], () => {
    async function main() {
      if (!ethers.utils.isAddress(leaderAddress)) {
        setLoading(false);
        setExists(false);
        return;
      }

      let membersLoadedFromChain = false;
      let membersFromChain: string[] = [];
      if (chainId && library) {
        try {
          membersFromChain = await getTeamMembers(chainId, library, competitionIndex, leaderAddress);
          membersLoadedFromChain = true;
        } catch (e) {}
      }

      const { data } = await getGraphClient(chainId).query({
        query,
        variables: {
          id: competitionIndex + "-" + leaderAddress.toLowerCase(),
        },
      });

      if (data.team !== null) {
        setData({
          rank: 1,
          pnl: Number(data.team.pnl),
          leaderAddress: ethers.utils.getAddress(leaderAddress),
          name: data.team.name,
          members: membersLoadedFromChain
            ? membersFromChain
            : data.team.members.map((member) => ethers.utils.getAddress(member.address)),
          positions: [],
          competitionIndex: competitionIndex,
        });

        setExists(true);
        setLoading(false);
        return;
      }

      if (!hasCompetitionContract(chainId) || !library || !chainId) {
        setExists(false);
        setLoading(false);
        return;
      }

      const contract = getCompetitionContract(chainId, library);
      const team = await contract.getTeam(competitionIndex, leaderAddress);

      if (isAddressZero(team.leaderAddress)) {
        setExists(false);
        setLoading(false);
        return;
      }

      let members: string[] = [];
      let start = 0;
      let offset = 50;
      while (true) {
        const res = await contract.getTeamMembers(competitionIndex, leaderAddress, start, offset);
        const filteredRes = res.filter((addr) => !isAddressZero(addr));

        filteredRes.forEach((addr) => {
          members.push(addr);
        });

        if (filteredRes.length < offset) {
          break;
        }

        start += offset;
      }

      setData({
        rank: 1,
        pnl: 0,
        leaderAddress: ethers.utils.getAddress(leaderAddress),
        name: team.name,
        members: members,
        positions: [],
        competitionIndex: competitionIndex,
      });

      setLoading(false);
    }

    main();
  });

  return { data, loading, exists, revalidate };
}
