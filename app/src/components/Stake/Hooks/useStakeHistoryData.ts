import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useAnchor } from '@/contexts/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';
import { getGmw396Enabled } from '@/config/featureFlagEnable';
import useSWR from 'swr';

export const STAKE_HISTORY_PAGE_SIZE = 10;

export interface StakeHistoryItem {
  id: string;
  amount: string | BN;
  lpMint: string;
  owner: string;
  position: string;
  positionId: string;
  timestamp: string | number | BN;
  txHash: string;
  actionType: 'Stake' | 'Unstake';
  stakeType?: string;
}

interface StakeHistoryResponse {
  data: {
    stakeGmGlvs: Omit<StakeHistoryItem, 'actionType'>[];
    unstakeLps: Omit<StakeHistoryItem, 'actionType'>[];
  };
}

const STAKE_HISTORY_KEY = 'data_store/stake_history_data';

const mapItem = (
  item: Omit<StakeHistoryItem, 'actionType'>,
  type: 'Stake' | 'Unstake'
): StakeHistoryItem => {
  const date = new Date(String(item?.timestamp));
  const timestamp = date.getTime();
  const bnTimestamp = new BN(timestamp);

  return {
    ...item,
    amount: new BN(String(item.amount)),
    timestamp: bnTimestamp,
    actionType: type,
  };
};

export const useStakeHistoryData = (
  page: number = 1,
  pageSize: number = STAKE_HISTORY_PAGE_SIZE,
  enabled: boolean = true
) => {
  const isGmw396Enabled = getGmw396Enabled();
  const { owner } = useAnchor();
  const { connected } = useWallet();
  const ownerAddress = owner?.toBase58();

  // Keep the largest page fetched so going back / sorting still has all
  // already-loaded frontend rows (e.g. page 1+2), without refetching full history.
  // Only relevant when GMW-396 pagination is active.
  const [loadedPage, setLoadedPage] = useState(1);

  useEffect(() => {
    if (!isGmw396Enabled) return;
    setLoadedPage(1);
  }, [ownerAddress, isGmw396Enabled]);

  useEffect(() => {
    if (!isGmw396Enabled) return;
    if (page > loadedPage) {
      setLoadedPage(page);
    }
  }, [page, loadedPage, isGmw396Enabled]);

  // Two timestamp-DESC streams are merged client-side. Per-stream offset would
  // drop rows that fall outside the current page window of either source, so
  // each request loads a time-ordered prefix with offset 0.
  // Fetch needed+1 (11, 21, …) so a full page can be distinguished from "exactly
  // needed items left"; the probe row is discarded before merge/sort.
  const neededCount = loadedPage * pageSize;
  const fetchLimit = neededCount + 1;
  const fetchOffset = 0;
  const swrEnabled = isGmw396Enabled ? enabled : true;

  const fetchUnStakeHistory = useCallback(async () => {
    if (!owner || !connected) return null;

    if (isGmw396Enabled) {
      const query = `
        query GetStakeHistory($owner: String!, $limit: Int!, $offset: Int!) {
          stakeGmGlvs(
            orderBy: timestamp_DESC,
            where: { owner_eq: $owner },
            limit: $limit,
            offset: $offset
          ) {
            amount id lpMint owner position positionId stakeType timestamp txHash
          }
          unstakeLps(
            orderBy: timestamp_DESC,
            where: { owner_eq: $owner },
            limit: $limit,
            offset: $offset
          ) {
            amount id lpMint owner position positionId timestamp txHash
          }
        }
      `;

      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: {
              owner: owner.toBase58(),
              limit: fetchLimit,
              offset: fetchOffset,
            },
          }),
        });

        return (await response.json()) as StakeHistoryResponse;
      } catch (error) {
        console.error('Error fetching stake history:', error);
        throw error;
      }
    }

    // Legacy: fetch full history (no limit / offset).
    const query = `
      query GetStakeHistory($owner: String!) {
        stakeGmGlvs(orderBy: timestamp_DESC, where: { owner_eq: $owner }) {
          amount id lpMint owner position positionId stakeType timestamp txHash
        }
        unstakeLps(orderBy: timestamp_DESC, where: { owner_eq: $owner }) {
          amount id lpMint owner position positionId timestamp txHash
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { owner: owner.toBase58() },
        }),
      });

      return (await response.json()) as StakeHistoryResponse;
    } catch (error) {
      console.error('Error fetching stake history:', error);
      throw error;
    }
  }, [owner, connected, fetchLimit, fetchOffset, isGmw396Enabled]);

  const { data: historyData, isLoading, mutate } = useSWR(
    swrEnabled && connected && ownerAddress
      ? isGmw396Enabled
        ? [STAKE_HISTORY_KEY, ownerAddress, loadedPage, pageSize]
        : [STAKE_HISTORY_KEY, ownerAddress]
      : null,
    fetchUnStakeHistory,
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
      dedupingInterval: 10000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const { stakeHistory, hasMore } = useMemo(() => {
    if (!historyData?.data) {
      return { stakeHistory: [] as StakeHistoryItem[], hasMore: false };
    }

    const { stakeGmGlvs = [], unstakeLps = [] } = historyData.data;

    if (!isGmw396Enabled) {
      const combined = [
        ...stakeGmGlvs.map((item) => mapItem(item, 'Stake')),
        ...unstakeLps.map((item) => mapItem(item, 'Unstake')),
      ].sort((a, b) => {
        const timeA = (a.timestamp as BN).toNumber();
        const timeB = (b.timestamp as BN).toNumber();
        return timeB - timeA;
      });
      return { stakeHistory: combined, hasMore: false };
    }

    // Probe row: length > neededCount means that source still has more on server.
    const sourceHasMore =
      stakeGmGlvs.length > neededCount || unstakeLps.length > neededCount;
    const stakeLoaded = stakeGmGlvs.slice(0, neededCount);
    const unstakeLoaded = unstakeLps.slice(0, neededCount);

    const combined = [
      ...stakeLoaded.map((item) => mapItem(item, 'Stake')),
      ...unstakeLoaded.map((item) => mapItem(item, 'Unstake')),
    ].sort((a, b) => {
      const timeA = (a.timestamp as BN).toNumber();
      const timeB = (b.timestamp as BN).toNumber();
      return timeB - timeA;
    });

    // Merged set can span more UI pages than loadedPage even when each source
    // returned fewer than neededCount (e.g. 8 + 5).
    const mergedHasMore = combined.length > neededCount;

    return {
      stakeHistory: combined,
      hasMore: sourceHasMore || mergedHasMore,
    };
  }, [historyData, neededCount, isGmw396Enabled]);

  return {
    stakeHistory,
    hasMore,
    isLoading,
    refresh: mutate,
  };
};
