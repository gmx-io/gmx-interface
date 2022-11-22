import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { useState, useEffect } from "react";
import { getNissohGraphClient } from "./graph";

export default function useGlobalLeaderboard(chainId, type: "settled" | "open", period: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const query = gql`
    query ($timestamp: Int!, $skip: Int!) {
      trades(
        first: 1000
        skip: $skip
        orderBy: timestamp
        orderDirection: desc
        where: { timestamp_gte: $timestamp, realisedPnl_not: 0 }
      ) {
        account
        realisedPnl
      }
    }
  `;

  useEffect(() => {
    async function main() {
      setLoading(true);

      const allTrades: any[] = [];

      for (let i = 0; ; i++) {
        const { data: res } = await getNissohGraphClient(chainId).query({
          query,
          variables: {
            timestamp: Math.round(Date.now() / 1000) - 86400,
            skip: i * 1000,
          },
        });

        allTrades.push(...res.trades);

        if (res.trades.length < 1000) {
          break;
        }
      }

      let traders: any = {};
      for (const trade of allTrades) {
        if (!traders[trade.account]) {
          traders[trade.account] = {
            address: trade.account,
            realizedPnl: BigNumber.from(0),
            winCount: 0,
            lossCount: 0,
          };
        }

        if (BigNumber.from(trade.realisedPnl).gt(0)) {
          traders[trade.account].winCount++;
        } else {
          traders[trade.account].lossCount++;
        }

        traders[trade.account].realizedPnl = traders[trade.account].realizedPnl.add(trade.realisedPnl);
      }

      traders = Object.values(traders).sort((a: any, b: any) => (a.realizedPnl.gt(b.realizedPnl) ? -1 : 1));

      setData(traders);
      setLoading(false);
    }

    main();
  }, [chainId, query, type, period]);

  return { data, loading };
}
