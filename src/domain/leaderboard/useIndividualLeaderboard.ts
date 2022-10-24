// import { gql } from "@apollo/client";
import { useState } from "react";
import useSWR from "swr";
// import { getGraphClient } from "./graph";

type Stat = {
  rank: number;
  account: string;
  realizedPnl: string;
  openPositions: number;
};

export default function useIndividualLeaderboard(chainId, period) {
  const [data, setData] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  // const query = gql`
  //   query ($period: String!, $timestamp: Int!, $skip: Int!) {
  //     accountStats (
  //       first: 1000
  //       skip: $skip
  //       where: {
  //         period: $period,
  //         timestamp: $timestamp
  //       }
  //     ) {
  //       account { address }
  //       realizedPnl
  //       positions { id }
  //     }
  //   }
  // `

  useSWR([chainId, period], async () => {
    // const stats: any = []

    // for (let page = 0;; page++) {
    //   const { data } = await getGraphClient(chainId).query({ query, variables: {
    //     skip: page * 1000,
    //     period: period,
    //     timestamp: 0
    //   }})

    //   stats.push(...data.accountStats)

    //   if (data.accountStats.length === 1000) {
    //     break
    //   }
    // }

    const dummyStat = {
      account: { address: "0x0000000000000000000000000000000000000000" },
      realizedPnl: "1000000000000000000000000000000000",
      positions: [{ id: 1 }, { id: 2 }, { id: 3 }],
    };

    const stats: any = [];
    for (let i = 0; i < 2000; i++) {
      stats.push(dummyStat);
    }

    const data = { accountStats: stats };

    const result: Stat[] = [];

    for (let i = 0; i < data.accountStats.length; i++) {
      const stat = data.accountStats[i];

      result.push({
        rank: i + 1,
        account: stat.account.address,
        realizedPnl: stat.realizedPnl,
        openPositions: stat.positions.length,
      });
    }

    setData(result);
    setLoading(false);
  });

  return { data, loading };
}
