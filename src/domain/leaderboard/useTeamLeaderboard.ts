import { gql } from "@apollo/client";
import { useState } from "react";
import useSWR from "swr";
import { getGraphClient } from "./graph";

export type Team = {
  id: string;
  rank: number;
  address: string;
  name: string;
  pnl: string;
  members: any[];
  positions: any[];
};

export default function useTeamLeaderboard(chainId, competitionIndex) {
  const [data, setData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const query = gql`
    query ($competitionIndex: BigInt!) {
      teams(first: 1000, orderBy: pnl, orderDirection: desc, where: { competition: $competitionIndex }) {
        id
        address
        name
        pnl
        members {
          id
        }
        positions {
          id
        }
      }
    }
  `;

  useSWR([chainId, competitionIndex], async () => {
    const teams: Team[] = [];

    for (let i = 1; i++; ) {
      const { data } = await getGraphClient(chainId).query({
        query,
        variables: {
          competitionIndex: competitionIndex,
        },
      });

      teams.push(
        ...data.teams.map((team: any) => ({
          rank: i,
          id: team.id,
          address: team.address,
          name: team.name,
          pnl: team.pnl,
          members: team.members,
          positions: team.positions,
        }))
      );

      if (data.teams.length < 1000) {
        break;
      }
    }

    setData(teams);
    setLoading(false);
  });

  return { data, loading };
}
