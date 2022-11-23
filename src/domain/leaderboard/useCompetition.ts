import { gql } from "@apollo/client";
import { useState, useEffect } from "react";
import { getGraphClient } from "./graph";

export type Competition = {
  index: number;
  start: number;
  end: number;
  registrationActive: boolean;
  active: boolean;
  maxTeamSize: number;
  type: number;
};

export function useCompetition(chainId, competitionIndex) {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [data, setData] = useState<Competition>({
    index: 0,
    start: 0,
    end: 0,
    registrationActive: false,
    active: false,
    maxTeamSize: 0,
    type: 0,
  });

  const query = gql`
    query ($id: Int!) {
      competition(id: $id) {
        id
        start
        end
        maxTeamSize
        canceled
      }
    }
  `;

  useEffect(() => {
    async function main() {
      setLoading(true);

      if (competitionIndex === null) {
        setExists(false);
        setLoading(false);
        return;
      }

      const { data: graphData } = await getGraphClient(chainId).query({ query, variables: { id: competitionIndex } });

      if (!graphData.competition) {
        setLoading(false);
        setExists(false);
        return;
      }

      if (graphData.competition.canceled) {
        setExists(false);
        setLoading(false);
        return;
      }

      const ts = Math.round(Date.now() / 1000);
      const start = Number(graphData.competition.start);
      const end = Number(graphData.competition.end);

      setData({
        index: competitionIndex,
        start: start,
        end: end,
        registrationActive: start > ts,
        active: start <= ts && end > ts,
        maxTeamSize: Number(graphData.competition.maxTeamSize),
        type: 3,
      });

      setExists(true);
      setLoading(false);
    }

    main();
  }, [chainId, competitionIndex, query]);

  return { data, exists, loading };
}
