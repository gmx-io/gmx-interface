import { TradeModel } from '@/config/competitions';
import { DEFAULT_SWR_REFRESH_INTERVAL_5S } from '@/config/ui';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useStoreProgram } from '@/contexts/anchor/hooks';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance';
import { PublicKey } from '@solana/web3.js';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface TradeHistoryResItem {
  id: string;
  user: string;
  beforeSizeInUsd: string;
  afterSizeInUsd: string;
  timestamp: string;
  gtDelta: string;
  callbackSharedDataAccount: string;
}

interface TradeHistoryItem {
  user: PublicKey;
  timestamp: number;
  volumeUsd: BN;
}

interface TradeHistoryResponse {
  data: {
    eligibleTrades: TradeHistoryResItem[];
  };
}

const TRADE_HISTORY_KEY = 'data_store/gt_history';
const useCompetitionGT = (
  competitionId: PublicKey,
  startTime: BN,
  endTime: BN
) => {
  const { data, isLoading } = useSWR(
    competitionId && endTime
      ? [
          TRADE_HISTORY_KEY,
          competitionId,
          startTime.toNumber(),
          endTime.toNumber(),
        ]
      : null,
    async () => {
      const startTimeUTC = new Date(startTime.toNumber() * 1000).toISOString();
      const endTimeUTC = new Date(endTime.toNumber() * 1000).toISOString();
      // console.log('Fetching competition trade history', competitionId.toString(), endTime.toNumber());
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // orderBy: timestamp_DESC,
          // orderBy: timestamp_DESC,
          body: JSON.stringify({
            query: `
            query MyQuery {
              eligibleTrades(
                where: {
                  timestamp_lte: "${endTimeUTC}"
                }
              ) {
                timestamp
                user
                gtDelta
                gt
                callbackSharedDataAccount
              }
            }`,
          }),
        });
        const result = (await response.json()) as TradeHistoryResponse;
        const list: TradeHistoryItem[] = [];
        const gtDeltaMaps = {};

        const groupedTrades = new Map<string, TradeHistoryItem[]>();
        result.data.eligibleTrades.forEach((trade) => {
          const userKey = trade.user.toBase58
            ? trade.user.toBase58()
            : String(trade.user);
          if (!groupedTrades.has(userKey)) {
            groupedTrades.set(userKey, []);
          }
          groupedTrades.get(userKey).push(trade);

          if (trade.callbackSharedDataAccount === competitionId.toString()) {
            gtDeltaMaps[userKey] = Number(trade.gtDelta || '0');
          }
        });
        groupedTrades.forEach((userTrades, user) => {
          if (gtDeltaMaps[user]) {
            let beforeGT = '0';
            let afterGT = '0';
            beforeGT =
              userTrades.findLast((trade) => {
                return trade.timestamp < startTimeUTC;
              })?.gt || '0';
            afterGT =
              userTrades.find((trade) => {
                return (
                  trade.timestamp >= startTimeUTC &&
                  trade.callbackSharedDataAccount === competitionId.toString()
                );
              })?.gt || '0';

            console.log(
              'hha',
              user,
              userTrades.findLast((trade) => {
                return trade.timestamp < startTimeUTC;
              }),
              userTrades.find((trade) => {
                return (
                  trade.timestamp >= startTimeUTC &&
                  trade.callbackSharedDataAccount === competitionId.toString()
                );
              })
            );
            gtDeltaMaps[user] += Number(afterGT) - Number(beforeGT) || 0;
          }
        });
        console.log('Fetched competition trade history:', {
          gtDeltaMaps,
          groupedTrades,
        });
        return gtDeltaMaps;
      } catch (error) {
        console.error('Error fetching trade history:', error);
        return {
          resList: [],
          gtDeltaMaps: {},
        };
      }
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_5S,
    }
  );

  // useEffect(() => {
  //   console.log('Fetching competition trade:', data?.gtDeltaMaps);
  // }, [data?.gtDeltaMaps]);

  return {
    isLoading,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    gtDeltaMaps: data || {},
  };
};

export default useCompetitionGT;
