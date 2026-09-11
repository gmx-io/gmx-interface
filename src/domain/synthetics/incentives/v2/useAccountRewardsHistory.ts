import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql } from "./client";
import { parseAccountRewardsHistoryPage, type RawRewardsHistoryEntry } from "./parsers";
import { ACCOUNT_REWARDS_HISTORY_QUERY } from "./queries";
import type { AccountRewardsHistoryPage, RewardsHistoryEntry } from "./types";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";

const MAX_PAGE_SIZE = 1000;
const COMPLETED_HISTORY_REFRESH_INTERVAL = 5 * CONFIG_UPDATE_INTERVAL;

export function createEmptyRewardsHistoryEntry(epoch: number): RewardsHistoryEntry {
  return {
    epoch,
    tradingVolume: 0n,
    tierVolume: 0n,
    referralVolume: 0n,
    esGmxRewards: 0n,
    gtRewards: 0n,
    rewardsUsd: 0n,
    tradingEsGmxRewards: 0n,
    tradingGtRewards: 0n,
    tradingRewardsUsd: 0n,
    referralEsGmxRewards: 0n,
    referralGtRewards: 0n,
    referralRewardsUsd: 0n,
    manualRewardsUsd: 0n,
  };
}

export function fillRewardsHistoryPage({
  entries,
  programStartTimestamp,
  currentEpoch,
  epochDuration,
  limit,
  offset,
}: {
  entries: RewardsHistoryEntry[];
  programStartTimestamp: number;
  currentEpoch: number;
  epochDuration: number;
  limit: number;
  offset: number;
}): AccountRewardsHistoryPage {
  if (epochDuration <= 0 || currentEpoch < programStartTimestamp) {
    return {
      entries: [],
      totalCount: 0,
      hasNextPage: false,
    };
  }

  const entriesByEpoch = new Map(entries.map((entry) => [entry.epoch, entry]));
  const expectedEntries: RewardsHistoryEntry[] = [];

  for (let epoch = currentEpoch; epoch >= programStartTimestamp; epoch -= epochDuration) {
    expectedEntries.push(entriesByEpoch.get(epoch) ?? createEmptyRewardsHistoryEntry(epoch));
  }

  const pageEntries = expectedEntries.slice(offset, offset + limit);

  return {
    entries: pageEntries,
    totalCount: expectedEntries.length,
    hasNextPage: offset + pageEntries.length < expectedEntries.length,
  };
}

async function fetchAccountRewardsHistoryPage({
  endpoint,
  account,
  limit,
  offset,
}: {
  endpoint: string;
  account: string;
  limit: number;
  offset: number;
}) {
  const response = await fetchIncentivesGraphql<{
    accountRewardsHistory: { totalCount: number; items: RawRewardsHistoryEntry[] };
  }>(endpoint, ACCOUNT_REWARDS_HISTORY_QUERY, { account, limit, offset });

  return parseAccountRewardsHistoryPage(response.accountRewardsHistory, limit, offset);
}

async function fetchAllAccountRewardsHistoryEntries(endpoint: string, account: string) {
  const entries: RewardsHistoryEntry[] = [];
  let offset = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await fetchAccountRewardsHistoryPage({
      endpoint,
      account,
      limit: MAX_PAGE_SIZE,
      offset,
    });

    entries.push(...page.entries);

    if (!page.hasNextPage || page.entries.length === 0) {
      hasNextPage = false;
    } else {
      offset += page.entries.length;
    }
  }

  return entries;
}

export function useAccountRewardsHistory(
  chainId: number,
  params: {
    account?: string;
    currentEpoch?: number;
    programStartTimestamp?: number;
    epochDuration?: number;
    enabled?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { account, currentEpoch, programStartTimestamp, epochDuration, enabled = true } = params;
  const endpoint = useIncentivesIndexerUrl(chainId);
  const validAccount = account && isAddress(account) ? account : undefined;
  const limit = Math.min(Math.max(Math.trunc(params.limit), 1), MAX_PAGE_SIZE);
  const offset = Math.max(Math.trunc(params.offset), 0);
  const shouldFillMissingEpochs =
    currentEpoch !== undefined &&
    programStartTimestamp !== undefined &&
    epochDuration !== undefined &&
    epochDuration > 0;
  const swrKey =
    enabled && endpoint && validAccount
      ? shouldFillMissingEpochs
        ? [
            "useAccountRewardsV2FullHistory",
            chainId,
            endpoint,
            validAccount,
            currentEpoch,
            programStartTimestamp,
            epochDuration,
          ]
        : ["useAccountRewardsV2HistoryPage", chainId, endpoint, validAccount, limit, offset]
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AccountRewardsHistoryPage>(swrKey, {
    fetcher: async () => {
      if (shouldFillMissingEpochs) {
        const entries = await fetchAllAccountRewardsHistoryEntries(endpoint!, validAccount!);

        return {
          entries,
          totalCount: entries.length,
          hasNextPage: false,
        };
      }

      return fetchAccountRewardsHistoryPage({
        endpoint: endpoint!,
        account: validAccount!,
        limit,
        offset,
      });
    },
    refreshInterval: offset === 0 ? CONFIG_UPDATE_INTERVAL : COMPLETED_HISTORY_REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });

  const pageData = useMemo(() => {
    if (
      !data ||
      !shouldFillMissingEpochs ||
      currentEpoch === undefined ||
      programStartTimestamp === undefined ||
      epochDuration === undefined
    ) {
      return data;
    }

    return fillRewardsHistoryPage({
      entries: data.entries,
      currentEpoch,
      programStartTimestamp,
      epochDuration,
      limit,
      offset,
    });
  }, [currentEpoch, data, epochDuration, limit, offset, programStartTimestamp, shouldFillMissingEpochs]);

  return useMemo(
    () => ({
      data: pageData?.entries,
      totalCount: pageData?.totalCount,
      hasNextPage: pageData?.hasNextPage ?? false,
      error,
      loading: isLoading,
      isValidating,
      mutate,
      endpoint,
    }),
    [endpoint, error, isLoading, isValidating, mutate, pageData]
  );
}
