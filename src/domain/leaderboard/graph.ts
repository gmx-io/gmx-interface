import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { ethers } from "ethers";
import { useState } from "react";
import useSWR from "swr";
import { isAddressZero } from "../../lib/legacy";
import { GRAPHS } from "./constants";
import { getCompetitionContract, getTeamMembers } from "./contracts";
import { Competition, Position, Stats, Team, TeamMembersStats } from "./types";

export function getGraphClient(chainId) {
  const graphUrl = GRAPHS[chainId]

  if ( ! graphUrl) {
    throw new Error("Unsupported chain " + chainId);
  }

  return new ApolloClient({
    uri: graphUrl,
    cache: new InMemoryCache()
  })
}

export function useIndividualStats(chainId, page, perPage) {
  const [data, setData] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(false)

  const query = gql`
    query ($first: Int!, $skip: Int!) {
      accountStats(
        first: $first,
        skip: $skip,
        orderBy: pnl,
        orderByDir: desc,
        where: {
          team: null,
        }
      ) {
        id
        pnl
        pnlPercent
      }
    }
  `

  useSWR([chainId, page, perPage], () => {
    async function main() {
      const { data: graphData } = await getGraphClient(chainId).query({ query, variables: {
        first: perPage + 1,
        skip: perPage * (page - 1)
      }})

      setHasNextPage(graphData.accountStats.length > perPage)

      setData(graphData.accountStats.slice(0, perPage).map((stats, i) => ({
        id: stats.id,
        label: stats.id,
        rank: i + 1,
        pnl: Number(stats.pnl),
        pnlPercent: Number(stats.pnlPercent)
      })))

      setLoading(false)
    }

    main()
  })

  return { data, loading, hasNextPage }
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
        where: {
          competition: $competitionIndex,
        }
      ) {
        id
        name
        pnlPercent
        pnl
        address
      }
    }
  `

  useSWR([chainId, competitionIndex,], () => {
    async function main() {
      const { data: graphData } = await getGraphClient(chainId).query({ query, variables: {
        competitionIndex,
      }})

      setData(graphData.teams.map((team, rank) => ({
        id: team.address,
        rank: rank + 1,
        pnl: team.pnl,
        pnlPercent: team.pnlPercent,
        leaderAddress: team.address,
        label: team.name,
      })))

      setLoading(false)
    }

    main()
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
        members { address }
      }
    }
  `

  const { revalidate } = useSWR([chainId, competitionIndex, leaderAddress, query, library], () => {
    async function main() {
      if (!leaderAddress) {
        setLoading(false)
        setExists(false)
        return
      }

      let membersLoadedFromChain = false
      let membersFromChain: string[] = []
      if (chainId && library) {
        try {
          membersFromChain = await getTeamMembers(chainId, library, competitionIndex, leaderAddress)
          membersLoadedFromChain = true
        } catch (e) {}
      }

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
          members: membersLoadedFromChain ? membersFromChain : data.team.members.map(member => ethers.utils.getAddress(member.address)),
          positions: [],
          competitionIndex: competitionIndex
        })

        setExists(true)
        setLoading(false)
        return
      }

      let contract
      try {
        contract = getCompetitionContract(chainId, library)
      } catch (err) {
        console.error(err)
        setExists(false)
        setLoading(false)
        return
      }
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
  })

  return { data, loading, exists, revalidate }
}

export function useTeamMembersStats(chainId, library, competitionIndex, leaderAddress, page, perPage) {
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

  const { revalidate } = useSWR([chainId, library, competitionIndex, leaderAddress, page, perPage], () => {
    async function main() {
      let addresses: string[] = []
      let loadedFromChain = false

      if (chainId && library) {
        try {
          addresses = await getTeamMembers(chainId, library, competitionIndex, leaderAddress)
          loadedFromChain = true
        } catch (err) {
          console.error(err)
        }
      }

      const res = await getGraphClient(chainId).query({ query, variables: {
        team: competitionIndex + "-" + leaderAddress.toLowerCase(),
        perPage: Number(perPage),
        skip: Number((page - 1) * perPage),
      }})

      const stats: TeamMembersStats[] = res.data.accountStats.map(stat => ({
        address: ethers.utils.getAddress(stat.account.address),
        pnl: Number(stat.pnl),
        pnlPercent: Number(stat.pnlPercent)
      }))

      let finalData: TeamMembersStats[] = []

      if (loadedFromChain) {
        addresses.forEach(addr => {
          const addrStat = stats.find(stat => stat.address === addr)
          finalData.push({
            address: addr,
            pnl: addrStat ? addrStat.pnl : 0,
            pnlPercent: addrStat ? addrStat.pnl : 0,
          })
        })
      } else {
        finalData = stats
      }

      setData(finalData)
      setLoading(false)
    }

    main()
  })

  return { data, loading, revalidate }
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
        canceled
      }
    }
  `

  useSWR([chainId, competitionIndex, query], () => {
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

      if (graphData.competition.canceled) {
        setExists(false)
        setLoading(false)
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
  })

  return { data, exists, loading };
}

export function useTeamPositions(chainId, leaderAddress) {
  const [data] = useState<Position[]>([])
  const [loading] = useState(true)

  return { data, loading }
}
