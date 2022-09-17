import { gql } from "@apollo/client";
import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react"
import { isAddressZero } from "../../lib/legacy";
import { getCompetitionContract } from "./contracts";
import { getGraphClient } from "./graph";
import { Team } from "./types";

// Fetch the team from the subgraph OR on-chain if the team is not in the subgraph yet
export const useTeam = (chainId, library, competitionIndex, leaderAddress) => {
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(false)
  const [data, setData] = useState<Team>({
    rank: 0,
    realizedPnl: BigNumber.from(0),
    leaderAddress: "",
    name: "",
    members: [],
    positions: [],
    competitionIndex: 0
  });

  const query = gql`
    query referralCodesOnAllChain($account: String!) {
      referralCodes(first: 1000, where: { owner: $account }) {
        code
      }
    }
  `;

  useEffect(() => {
    async function main () {
      if (!chainId) {
        return
      }

      if (!ethers.utils.isAddress(leaderAddress)) {
        setExists(false)
        setLoading(false)
        return
      }

      const graphClient = getGraphClient(chainId)
      const { data: graphData } = await graphClient.query({ query, variables: { account: leaderAddress } })

      if (graphData.referralCodes.length !== 0) {
        setData({
          rank: 1,
          realizedPnl: BigNumber.from("0"),
          leaderAddress: "",
          name: "",
          members: [],
          positions: [],
          competitionIndex: competitionIndex,
        })
        setLoading(false)
        setExists(true)
        return
      }

      if (!library) {
        return
      }

      // If the team is not in the graph, we try onchain
      const contract = getCompetitionContract(chainId, library)
      const team = await contract.getTeam(competitionIndex, leaderAddress)

      if (isAddressZero(team.leaderAddress)) {
        setExists(false)
        setLoading(false)
        return
      }

      setData({
        rank: 0,
        realizedPnl: BigNumber.from("0"),
        leaderAddress: team.leaderAddress,
        name: team.name,
        members: [],
        positions: [],
        competitionIndex: competitionIndex,
      })

      setExists(true)
      setLoading(false)
    }

    main()
  }, [chainId, library, competitionIndex, leaderAddress, query])

  return { data, exists, loading };
}
