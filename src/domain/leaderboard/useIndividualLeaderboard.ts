import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { useState } from "react";
import useSWR from "swr";
import { getNissohGraphClient } from "./graph";

export type Stat = {
  rank: number;
  account: string;
  realizedPnl: string;
  winCount: number;
  lossCount: number;
};

export default function useIndividualLeaderboard(chainId, period) {
  const [data, setData] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  const query = gql`
    query ($timestamp: Int!, $skip: Int!) {
      trades(first: 1000, skip: $skip, where: { timestamp_gte: $timestamp }) {
        account
        realisedPnl
      }
    }
  `;

  useSWR(
    [chainId],
    () => {
      async function main() {
        const trades: any = [];

        for (let page = 0; ; page++) {
          const { data } = await getNissohGraphClient(chainId).query({
            query,
            variables: {
              skip: page * 1000,
              timestamp: Math.round(Date.now() / 1000) - 86400,
            },
          });

          trades.push(...data.trades);

          if (data.trades.length < 1000) {
            break;
          }
        }

        let tmpTraders: any = {};
        for (const trade of trades) {
          if (!tmpTraders[trade.account]) {
            tmpTraders[trade.account] = {
              account: trade.account,
              realizedPnl: BigNumber.from(0),
              winCount: 0,
              lossCount: 0,
            };
          }

          if (BigNumber.from(trade.realisedPnl).gt(0)) {
            tmpTraders[trade.account].winCount++;
          } else {
            tmpTraders[trade.account].lossCount++;
          }

          tmpTraders[trade.account].realizedPnl = tmpTraders[trade.account].realizedPnl.add(trade.realisedPnl);
        }

        tmpTraders = Object.values(tmpTraders);

        tmpTraders.sort((a, b) => (a.realizedPnl.gt(b.realizedPnl) ? -1 : 1));

        const traders: Stat[] = [];
        for (const i in tmpTraders) {
          const tmpTrader = tmpTraders[i];

          traders.push({
            rank: Number(i) + 1,
            account: tmpTrader.account,
            realizedPnl: tmpTrader.realizedPnl,
            winCount: tmpTrader.winCount,
            lossCount: tmpTrader.lossCount,
          });
        }

        setData(traders);
        setLoading(false);
      }

      main();
    },
    {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return { data, loading };
}
