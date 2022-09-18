import { ApolloClient, InMemoryCache } from "@apollo/client";
import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
import { ARBITRUM, AVALANCHE, isAddressZero } from "../../lib/legacy";
import { getCompetitionContract } from "./contracts";
import { MemberStats, Stats } from "./types";

export function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return new ApolloClient({
      uri: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals",
      cache: new InMemoryCache()
    })
  } else if (chainId === AVALANCHE) {
    return new ApolloClient({
      uri: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals",
      cache: new InMemoryCache()
    })
  }

  throw new Error("Unsupported chain " + chainId);
}

export function useIndividualStats(chainId) {
  const [data, setData] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main() {
      setTimeout(() => {
        setData([{
          id: "0x6887246668a3b87f54deb3b94ba47a6f63f32985",
          rank: 1,
          label: "0x6887246668a3b87f54deb3b94ba47a6f63f32985",
          pnl: BigNumber.from("100000000000000000000000000000000000"),
          pnlPercent: BigNumber.from("15")
        }]);

        setLoading(false)
      }, 1000);
    }

    main()
  })

  return { data, loading }
}

export function useTeamsStats(chainId) {
  const [data, setData] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main() {
      setTimeout(() => {
        setData([
          {
            id: "0x0000",
            rank: 1,
            label: "Morazzela",
            pnl: BigNumber.from("100000000000000000000000000000000000"),
            pnlPercent: BigNumber.from("15"),
          },
        ]);

        setLoading(false)
      }, 1000);
    }

    main();
  }, [setData, chainId]);

  return { data, loading }
}

export function useTeamMembersStats(chainId, library, competitionIndex, leaderAddress, page, perPage) {
  const [data, setData] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main() {
      if (!chainId || !library) {
        return
      }

      const contract = getCompetitionContract(chainId, library)

      let res = await contract.getTeamMembers(
        competitionIndex,
        leaderAddress,
        (page - 1) * perPage,
        page * perPage,
      )

      res = res.filter(memberAddress => !isAddressZero(memberAddress)).map(memberAddress => ({
        address: memberAddress,
      }))

      setData(res)
      setLoading(false)
    }

    main()
  }, [chainId, library, competitionIndex, leaderAddress, page, perPage])

  return { data, loading }
}
