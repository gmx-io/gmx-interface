import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { ethers } from "ethers";
import { useState } from "react";
import useSWR from "swr";
import { isAddressZero } from "../../lib/legacy";
import { getAdressesDomains } from "../ens/graph";
import { GRAPHS } from "./constants";
import { getCompetitionContract, getTeamMembers } from "./contracts";
import { Competition, Position, Team, TeamMembersStats } from "./types";

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

export function useIndividuals(chainId) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const query = gql`
    query {
      accountStats(
        first: 1000,
        orderBy: pnl,
        orderByDir: desc,
        where: {
          team: null,
        }
      ) {
        id
        pnl
        positions { id }
      }
    }
  `

  useSWR([chainId], () => {
    async function main() {
      const { data: graphData } = await getGraphClient(chainId).query({ query })

      setData(graphData.accountStats)
      setLoading(false)

      const ensDomains = await getAdressesDomains(graphData.accountStats.map(stat => stat.id))

      setData(stats => stats.map(stat => {
        if (ensDomains[stat.id]) {
          stat.ens = ensDomains[stat.id]
        }

        return stat
      }))
    }

    main()
  })

  return { data, loading }
}

export function useTeams(chainId, competitionIndex) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)

  const query = gql`
    query ($competitionIndex: BigInt!) {
      teams (
        first: 1000,
        orderBy: pnl,
        orderDirection: desc,
        where: {
          competition: $competitionIndex,
        }
      ) {
        name
        pnl
        address
        positions { id }
        members { id }
      }
    }
  `

  useSWR([chainId, competitionIndex], () => {
    async function main() {
      const { data: graphData } = await getGraphClient(chainId).query({ query, variables: {
        competitionIndex,
      }})

      setData(graphData.teams)
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
