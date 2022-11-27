import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { useState, useEffect } from "react";
import { Period } from "./constants";
import { getNissohGraphClient } from "./graph";

export function useGeneralSettledLeaderboard(chainId, period: Period) {
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

      let seconds = 0;
      if (period === Period.day) {
        seconds = 86400;
      } else if (period === Period.week) {
        seconds = 86400 * 7;
      } else if (period === Period.month) {
        seconds = 86400 * 7 * 4;
      }

      const allTrades: any[] = [];

      for (let i = 0; ; i++) {
        const { data: res } = await getNissohGraphClient(chainId).query({
          query,
          variables: {
            timestamp: Math.round(Date.now() / 1000) - seconds,
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
            account: trade.account,
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

      traders = Object.values(traders)
        .sort((a: any, b: any) => (a.realizedPnl.gt(b.realizedPnl) ? -1 : 1))
        .map((trader: any, i: number) => {
          trader.rank = i + 1;
          return trader;
        });

      setData(traders);
      setLoading(false);
    }

    main();
  }, [chainId, query, period]);

  return { data, loading };
}

export function useGeneralOpenLeaderboard(chainId, period: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const query = gql`
    query {
      trades(first: 1000, skip: $skip, orderBy: realisedPnl, orderDirection: desc, where: { status: open }) {
        account
        realisedPnl
        averagePrice
        sizeDelta
        collateralDelta
        indexToken
        isLong
      }
    }
  `;

  useEffect(() => {
    async function main() {
      setLoading(true);

      const { data: res } = await getNissohGraphClient(chainId).query({ query });

      setData(
        res.trades.map((trade: any, index: number) => {
          return {
            address: trade.account,
            realizedPnl: trade.realisedPnl,
            rank: index + 1,
            averagePrice: trade.averagePrice,
            sizeDelta: trade.sizeDelta,
            leverage: BigNumber.from(trade.sizeDelta).div(trade.collateralDelta),
            token: trade.indexToken,
            liquidationPrice: BigNumber.from(0),
            isLong: trade.isLong,
          };
        })
      );

      setLoading(false);
    }

    main();
  }, [chainId, query, period]);

  return { data, loading };
}
