import { useMemo } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { getIndexerUrl } from "config/indexers";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { isMultichainFundingItemLoading } from "domain/multichain/isMultichainFundingItemLoading";
import { MultichainFundingHistoryItem } from "domain/multichain/types";
import { useChainId } from "lib/chains";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { isValidTokenSafe } from "sdk/configs/tokens";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

const query = /* gql */ `
query ($account: String, $guid: String) {
  multichainFunding(where: {account: $account, id: $guid}) {
    id
    step
    account
    sentAmount
    receivedAmount
    isExecutionError
    executedTimestamp
    executedTxn
    operation
    receivedTimestamp
    receivedTxn
    sentTimestamp
    sentTxn
    settlementChainId
    sourceChainId
    token
  }
}
`;

async function fetchGmxAccountFundingHistory(
  chainId: number,
  variables: {
    account?: string;
    guid?: string;
  }
): Promise<MultichainFundingHistoryItem[]> {
  const subsquidUrl = getIndexerUrl(chainId, "subsquid");

  if (!subsquidUrl) {
    throw new Error("No squid url");
  }

  const response = (await graphqlFetcher(subsquidUrl, query, variables)) as {
    multichainFunding: MultichainFundingHistoryItem[];
  };

  return response.multichainFunding
    .filter((item) => isValidTokenSafe(chainId, item.token))
    .map(
      (item): MultichainFundingHistoryItem => ({
        ...item,
        sentAmount: BigInt(item.sentAmount),
        receivedAmount: item.receivedAmount ? BigInt(item.receivedAmount) : undefined,
        sentTimestamp: item.sentTimestamp,
        receivedTimestamp: item.receivedTimestamp ? item.receivedTimestamp : undefined,
        executedTimestamp: item.executedTimestamp ? item.executedTimestamp : undefined,

        receivedTxn: item.receivedTxn ? item.receivedTxn : undefined,
        executedTxn: item.executedTxn ? item.executedTxn : undefined,
      })
    );
}

const STEP_ORDER: Record<MultichainFundingHistoryItem["step"], number> = {
  submitted: 1,
  sent: 2,
  received: 3,
  executed: 4,
};

function isStepGreaterOrEqual(
  step: MultichainFundingHistoryItem["step"],
  than: MultichainFundingHistoryItem["step"]
): boolean {
  return STEP_ORDER[step] - STEP_ORDER[than] >= 0;
}

export function isStepGreater(
  step: MultichainFundingHistoryItem["step"],
  than: MultichainFundingHistoryItem["step"]
): boolean {
  return STEP_ORDER[step] - STEP_ORDER[than] > 0;
}

function getFundingHistoryKey(chainId: number, account: string | undefined) {
  return account ? [chainId, "gmx-account-funding-history", account] : null;
}

export function useGmxAccountFundingHistory(opts?: { enabled?: boolean }): {
  fundingHistory: MultichainFundingHistoryItem[] | undefined;
  isLoading: boolean;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const { pendingMultichainFunding, updatePendingMultichainFunding } = useSyntheticsEvents();

  const { data, isLoading } = useSWR<MultichainFundingHistoryItem[]>(
    opts?.enabled !== false ? getFundingHistoryKey(chainId, account) : null,
    {
      fetcher: () => fetchGmxAccountFundingHistory(chainId, { account }),
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      onSuccess(data) {
        updatePendingMultichainFunding(data);
      },
    }
  );

  const mergedData = useMemo(() => {
    let mergedData = data ? [...data] : [];
    const guidToIndex: Partial<Record<string, number>> = {};

    for (let index = 0; index < mergedData.length; index++) {
      const guid = mergedData[index].id;
      guidToIndex[guid] = index;
    }

    const dataToUnshift: MultichainFundingHistoryItem[] = [];

    for (const item of pendingMultichainFunding) {
      if (item.step === "submitted") {
        continue;
      }

      const currentIndex = guidToIndex[item.id];

      if (currentIndex === undefined) {
        dataToUnshift.unshift(item);
        continue;
      }

      const current = mergedData[currentIndex];

      if (isStepGreaterOrEqual(current.step, item.step)) {
        continue;
      }

      mergedData[currentIndex] = item;
    }

    mergedData = dataToUnshift.concat(mergedData);

    const alreadySentTxns = mergedData.filter((item) => item.sentTxn !== undefined).map((item) => item.sentTxn!);

    const filteredSubmittedEvents = pendingMultichainFunding.filter(
      (item) => item.step === "submitted" && (!item.sentTxn || !alreadySentTxns.includes(item.sentTxn))
    );

    mergedData = [...filteredSubmittedEvents, ...mergedData];

    mergedData.sort((a, b) => b.sentTimestamp - a.sentTimestamp);

    return mergedData;
  }, [data, pendingMultichainFunding]);

  return { fundingHistory: mergedData, isLoading };
}

function useGmxAccountPendingFundingHistoryItem(guid: string | undefined): MultichainFundingHistoryItem | undefined {
  const { pendingMultichainFunding } = useSyntheticsEvents();

  const pendingItem = useMemo((): MultichainFundingHistoryItem | undefined => {
    if (!guid) {
      return undefined;
    }

    const pendingItem = pendingMultichainFunding.find((item) => item.id === guid);

    return pendingItem;
  }, [guid, pendingMultichainFunding]);

  return pendingItem;
}

export function useGmxAccountFundingHistoryItem(
  guid: string | undefined,
  opts?: { refetch?: boolean }
): {
  transfer: MultichainFundingHistoryItem | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  // read-only subscription to the already loaded history list, so the item renders without waiting for its own request
  const { data: historyData } = useSWR<MultichainFundingHistoryItem[]>(
    guid ? getFundingHistoryKey(chainId, account) : null,
    null
  );

  const historyItem = historyData?.find((item) => item.id === guid);
  // a finished transfer from the list won't change anymore, so its own request is not needed
  const isHistoryItemFinal = historyItem !== undefined && !isMultichainFundingItemLoading(historyItem);

  const { data, isLoading, error } = useSWR(
    guid && !isHistoryItemFinal ? [chainId, "gmx-account-funding-history-item", account, guid] : null,
    {
      fetcher: () => fetchGmxAccountFundingHistory(chainId, { account, guid }),
      refreshInterval: opts?.refetch ? FREQUENT_UPDATE_INTERVAL : 0,
    }
  );

  const pendingItem = useGmxAccountPendingFundingHistoryItem(guid);

  // the furthest step wins, ties go to the polled history list first
  const transfer = [historyItem, data?.[0], pendingItem].reduce<MultichainFundingHistoryItem | undefined>(
    (latest, item) => (item && (!latest || isStepGreater(item.step, latest.step)) ? item : latest),
    undefined
  );

  return {
    transfer,
    isLoading: transfer === undefined && isLoading,
    error: transfer === undefined ? error : undefined,
  };
}
