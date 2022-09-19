import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ARBITRUM_TESTNET, isAddressZero } from "../../lib/legacy";
import { ARBITRUM_TESTNET_GRAPH } from "./constants";
import { getCompetitionContract } from "./contracts";
import { Competition, Stats, Team, TeamMembersStats } from "./types";

export function getGraphClient(chainId) {
  if (chainId === ARBITRUM_TESTNET) {
    return new ApolloClient({
      uri: ARBITRUM_TESTNET_GRAPH,
      cache: new InMemoryCache()
    })
  }

  throw new Error("Unsupported chain " + chainId);
}

export function useIndividualStats(chainId) {
  const [data, setData] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)

  const query = gql`
    query {
      accountStats (
        first: 10,
        orderBy: pnl,
        orderByDir: desc
      ) {
        id
        pnl
        pnlPercent
      }
    }
  `

  useSWR([chainId], async () => {
    const { data } = await getGraphClient(chainId).query({ query })

    setData(data.accountStats.map((stats, i) => ({
      id: stats.id,
      label: stats.id,
      rank: i + 1,
      pnl: Number(stats.pnl),
      pnlPercent: Number(stats.pnlPercent)
    })))

    setLoading(false)
  })

  return { data, loading }
}

export function useTeamsStats(chainId, competitionIndex) {
  const [data, setData] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true)

  const query = gql`
    query ($competitionIndex: BigInt!) {
      teams (
        first: 1000,
        orderBy: pnlPercent,
        orderDirection: desc,
        where: { competition: $competitionIndex }
      ) {
        id
        name
        pnlPercent
        pnl
        leader { id }
      }
    }
  `

  useSWR([chainId, competitionIndex], async () => {
    const { data } = await getGraphClient(chainId).query({ query, variables: { competitionIndex } })

    setData(data.teams.map((team, rank) => ({
      id: team.leader.id,
      rank: rank + 1,
      pnl: team.pnl,
      pnlPercent: team.pnlPercent,
      leaderAddress: team.leader.id,
      label: team.name,
    })))

    setLoading(false)
  });

  return { data, loading }
}

export function useTeam(chainId, library, competitionIndex, leaderAddress) {
  const [data, setData] = useState<Team>({
    rank: 0,
    pnl: 0,
    pnlPercent: 0,
    leaderAddress: "",
    name: "",
    members: [],
    positions: [],
    competitionIndex: 0,
  });
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(true)

  const query = gql`
    query ($id: String!) {
      team (id: $id) {
        id
        name
        pnl
        pnlPercent
        members { id }
      }
    }
  `

  useEffect(() => {
    if (!leaderAddress) {
      setLoading(false)
      setExists(false)
      return
    }

    async function main() {
      const { data } = await getGraphClient(chainId).query({ query, variables: {
        id: competitionIndex + "-" + leaderAddress.toLowerCase()
      }})

      if (data.team !== null) {
        setData({
          rank: 1,
          pnl: Number(data.team.pnl),
          pnlPercent: Number(data.team.pnlPercent),
          leaderAddress: ethers.utils.getAddress(leaderAddress),
          name: data.team.name,
          members: data.team.members,
          positions: [],
          competitionIndex: competitionIndex
        })

        setExists(true)
        setLoading(false)
        return
      }

      const contract = getCompetitionContract(chainId, library)
      const team = await contract.getTeam(competitionIndex, leaderAddress)

      if (isAddressZero(team.leaderAddress)) {
        setExists(false)
        setLoading(false)
        return
      }

      let members: string[] = []
      let start = 0
      let offset = 50
      while (true) {
        const res = await contract.getTeamMembers(competitionIndex, leaderAddress, start, offset)
        const filteredRes = res.filter(addr => !isAddressZero(addr))

        filteredRes.forEach(addr => {
          members.push(addr)
        })

        if (filteredRes.length < offset) {
          break
        }

        start += offset
      }

      setData({
        rank: 1,
        pnl: 0,
        pnlPercent: 0,
        leaderAddress: ethers.utils.getAddress(leaderAddress),
        name: team.name,
        members: members,
        positions: [],
        competitionIndex: competitionIndex
      })

      setLoading(false)
    }

    main()
  }, [chainId, competitionIndex, leaderAddress, query, library])

  return { data, loading, exists }
}

export function useTeamMembersStats(chainId, competitionIndex, leaderAddress, page, perPage) {
  const [data, setData] = useState<TeamMembersStats[]>([]);
  const [loading, setLoading] = useState(true)

  const query = gql`
    query ($team: String!, $perPage: Int!, $skip: Int!) {
      accountStats (
        first: $perPage,
        skip: $skip
        orderBy: pnl,
        orderByDir: desc,
        where: {
          team: $team
        }
      ) {
        account { address }
        pnl
        pnlPercent
      }
    }
  `

  useSWR([chainId, competitionIndex, leaderAddress, page, perPage], async () => {
    const res = await getGraphClient(chainId).query({ query, variables: {
      team: competitionIndex + "-" + leaderAddress.toLowerCase(),
      perPage: Number(perPage),
      skip: Number((page - 1) * perPage),
    }})

    setData(res.data.accountStats.map(stats => ({
      address: ethers.utils.getAddress(stats.account.address),
      pnl: Number(stats.pnl),
      pnlPercent: Number(stats.pnlPercent)
    })))

    setLoading(false)
  })

  return { data, loading }
}

export function useCompetition(chainId, competitionIndex) {
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(false)
  const [data, setData] = useState<Competition>({
    index: 0,
    start: 0,
    end: 0,
    registrationActive: false,
    active: false,
    maxTeamSize: 0
  });

  const query = gql`
    query ($id: Int!) {
      competition (id: $id) {
        id
        start
        end
        maxTeamSize
      }
    }
  `

  useEffect(() => {
    if (!competitionIndex && competitionIndex !== 0) {
      setExists(false)
      setLoading(false)
      return
    }

    async function main() {
      const { data: graphData } = await getGraphClient(chainId).query({ query, variables: { id: competitionIndex } })

      if (!graphData.competition) {
        setLoading(false)
        setExists(false)
        return
      }

      const ts = Math.round(Date.now() / 1000);
      const start = Number(graphData.competition.start)
      const end = Number(graphData.competition.end)

      setData({
        index: competitionIndex,
        start: start,
        end: end,
        registrationActive: start > ts,
        active: start <= ts && end > ts,
        maxTeamSize: Number(graphData.competition.maxTeamSize),
      })

      setExists(true)
      setLoading(false)
    }

    main()
  }, [chainId, competitionIndex, query])

  return { data, exists, loading };
}
