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

const mergeTrades = (
  trades: TradeHistoryItem[],
  mergeWindow: BN,
  volumeThreshold: BN
) => {
  const groupedTrades = new Map<string, TradeHistoryItem[]>();
  trades.forEach((trade) => {
    const userKey = trade.user.toBase58
      ? trade.user.toBase58()
      : String(trade.user);
    if (!groupedTrades.has(userKey)) {
      groupedTrades.set(userKey, []);
    }
    groupedTrades.get(userKey).push(trade);
  });

  const eligibleTrades: TradeHistoryItem[] = [];
  groupedTrades.forEach((userTrades, user) => {
    let currentVolume = new BN(0);
    let currentTimestamp = 0;
    for (let i = 0; i < userTrades.length; i++) {
      const trade = userTrades[i];
      if (currentVolume.isZero()) {
        currentTimestamp = trade.timestamp;
      }
      if (
        !currentVolume.isZero() &&
        new BN(trade.timestamp - currentTimestamp).gt(mergeWindow)
      ) {
        eligibleTrades.push({
          user: trade.user,
          timestamp: currentTimestamp,
          volumeUsd: currentVolume,
        });
        currentVolume = new BN(0);
        currentTimestamp = trade.timestamp;
      }
      currentVolume = currentVolume.add(trade.volumeUsd);
      currentTimestamp = trade.timestamp;
      if (currentVolume.gte(volumeThreshold)) {
        eligibleTrades.push({
          user: trade.user,
          timestamp: currentTimestamp,
          volumeUsd: currentVolume,
        });
        currentVolume = new BN(0);
        currentTimestamp = 0;
      }
    }
    eligibleTrades.push({
      user: new PublicKey(user),
      timestamp: currentTimestamp,
      volumeUsd: currentVolume,
    });
  });
  // console.log('mergeTrades',
  //   trades.map(item => ({
  //   volumeUsd: item.volumeUsd.toString(),
  //   timestamp: item.timestamp,
  //   user: item.user.toString()
  //   })),
  //   eligibleTrades.map(item => ({
  //   volumeUsd: item.volumeUsd.toString(),
  //   timestamp: item.timestamp,
  //   user: item.user.toString()
  // })).sort((a, b) => b.timestamp - a.timestamp));
  return eligibleTrades.sort((a, b) => b.timestamp - a.timestamp);
};

// const thresholdVolumeUsd = new BN(10000).mul(
//   expandDecimals(BN_ONE, USD_DECIMALS)
// );
const maxOverThresholdCount = 5;

const TRADE_HISTORY_KEY = 'data_store/gt_history';
const useCompetitionTradeHistory = (
  competitionId: PublicKey,
  volumeMergeWindow: BN,
  volumeThreshold: BN,
  endTime: BN,
  tradeModel: TradeModel
) => {
  const storeProgram = useStoreProgram();

  const { data, isLoading } = useSWR(
    competitionId && endTime
      ? [TRADE_HISTORY_KEY, competitionId, endTime.toString()]
      : null,
    async () => {
      // console.log('Fetching competition trade history', competitionId.toString(), endTime.toNumber());
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // orderBy: timestamp_DESC,
          body: JSON.stringify({
            query: `
            query MyQuery {
              eligibleTrades(
                where: {
                  callbackSharedDataAccount_eq: "${competitionId.toString()}"
                  timestamp_lte: "${new Date(endTime.toNumber() * 1000).toISOString()}"
                }
              ) {
                timestamp
                user
                gtDelta
                afterSizeInUsd
                beforeSizeInUsd
                callbackSharedDataAccount
                id
              }
            }`,
          }),
        });
        const result = (await response.json()) as TradeHistoryResponse;
        const list: TradeHistoryItem[] = [];
        const gtDeltaMaps = {};
        result.data.eligibleTrades.forEach((item) => {
          const { user, timestamp, afterSizeInUsd, beforeSizeInUsd, gtDelta } =
            item;
          const timestampUnix = dayjs(timestamp).utc().unix();
          const userPublicKey = new PublicKey(user);
          const volumeUsd = new BN(afterSizeInUsd || 0).sub(
            new BN(beforeSizeInUsd || 0)
          );
          const volumeUsdAbs = volumeUsd.abs();
          gtDeltaMaps[userPublicKey.toBase58()] = gtDelta || '0';
          // Check if the trade is open or closed or all
          if (
            tradeModel === TradeModel.ALL ||
            (tradeModel === TradeModel.OPEN && volumeUsd.gt(BN_ZERO)) ||
            (tradeModel === TradeModel.CLOSED && volumeUsd.lte(BN_ZERO))
          ) {
            list.push({
              timestamp: timestampUnix,
              volumeUsd: volumeUsdAbs,
              user: userPublicKey,
            });
          }
        });
        return {
          resList: list,
          gtDeltaMaps,
        };
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

  const [myLastestThresholdTrade, setMyLastestThresholdTrade] =
    useState<TradeHistoryItem>();
  const [lastestThresholdTradeList, setLastestThresholdTradeList] = useState<
    TradeHistoryItem[]
  >([]);
  const [lastestTradeList, setLastestTradeList] = useState<TradeHistoryItem[]>(
    []
  );

  useEffect(() => {
    if (!volumeMergeWindow || !data?.resList || !volumeThreshold) return;
    const newTradeList = mergeTrades(
      data.resList,
      volumeMergeWindow,
      volumeThreshold
    );
    const owner = storeProgram.provider.publicKey;
    const list: TradeHistoryItem[] = [];
    const newLastestTradeList: TradeHistoryItem[] = [];
    let newMyLastestThresholdTrade: TradeHistoryItem | null = null;
    newTradeList?.forEach((tradeItem, index) => {
      // const { user, timestamp, volumeUsd } = item;
      const isGreaterThanThreshold = tradeItem.volumeUsd.gte(volumeThreshold);

      // const tradeItem = {
      //   timestamp: timestampUnix,
      //   volumeUsd: volumeUsd,
      //   user: userPublicKey,
      // };
      // set lastest 5 trade
      if (index < 1) {
        newLastestTradeList.push(tradeItem);
      }
      // self lastest threshold trade
      if (
        owner &&
        tradeItem.user.equals(owner) &&
        isGreaterThanThreshold &&
        !newMyLastestThresholdTrade
      ) {
        newMyLastestThresholdTrade = tradeItem;
      }
      if (isGreaterThanThreshold && list.length < maxOverThresholdCount) {
        list.push(tradeItem);
      }
    });
    setLastestTradeList(newLastestTradeList);
    setLastestThresholdTradeList(list);
    if (newMyLastestThresholdTrade)
      setMyLastestThresholdTrade(newMyLastestThresholdTrade);
  }, [
    data?.resList,
    myLastestThresholdTrade?.timestamp,
    storeProgram.provider.publicKey,
    volumeMergeWindow,
    volumeThreshold,
  ]);

  // useEffect(() => {
  //   console.log('Fetching competition trade:', data?.gtDeltaMaps);
  // }, [data?.gtDeltaMaps]);

  return {
    lastestThresholdTradeList: lastestThresholdTradeList,
    myLastestThresholdTrade: myLastestThresholdTrade,
    lastestTradeList: lastestTradeList,
    isLoading,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    gtDeltaMaps: data?.gtDeltaMaps || {},
  };
};

export default useCompetitionTradeHistory;
