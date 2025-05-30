import { useMemo } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { getSubgraphUrl } from "config/subgraph";
import { MultichainFundingHistoryItem } from "context/GmxAccountContext/types";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useChainId } from "lib/chains";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
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
  const subsquidUrl = getSubgraphUrl(chainId, "subsquid");

  if (!subsquidUrl) {
    throw new Error("No squid url");
  }

  const response = (await graphqlFetcher(subsquidUrl, query, variables)) as {
    multichainFunding: MultichainFundingHistoryItem[];
  };

  return response.multichainFunding.map(
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

export function useGmxAccountFundingHistory(opts?: { enabled?: boolean }): MultichainFundingHistoryItem[] | undefined {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const { pendingMultichainFunding } = useSyntheticsEvents();

  const { data } = useSWR<MultichainFundingHistoryItem[]>(
    account && opts?.enabled !== false ? ["gmx-account-funding-history", account] : null,
    {
      fetcher: () => fetchGmxAccountFundingHistory(chainId, { account }),
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      // TODO: if websockets break, put data in event state from here
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

    for (const step of ["executed", "received", "sent"] as const) {
      for (const pendingGuid in pendingMultichainFunding.deposits[step]) {
        const currentIndex = guidToIndex[pendingGuid];

        if (currentIndex === undefined) {
          dataToUnshift.unshift(pendingMultichainFunding.deposits[step][pendingGuid]);
          continue;
        }

        const current = mergedData[currentIndex];

        if (isStepGreaterOrEqual(current.step, step)) {
          continue;
        }

        mergedData[currentIndex] = pendingMultichainFunding.deposits[step][pendingGuid];
      }
    }

    mergedData = dataToUnshift.concat(mergedData);

    const alreadySentTxns = mergedData.filter((item) => item.sentTxn !== undefined).map((item) => item.sentTxn!);

    const filteredSubmittedEvents = pendingMultichainFunding.deposits.submitted.filter(
      (item) => !item.sentTxn || !alreadySentTxns.includes(item.sentTxn)
    );

    mergedData = [...filteredSubmittedEvents, ...mergedData];

    mergedData.sort((a, b) => b.sentTimestamp - a.sentTimestamp);

    return mergedData;
  }, [data, pendingMultichainFunding.deposits]);

  return mergedData;
}

export function useGmxAccountPendingFundingHistoryItem(
  guid: string | undefined
): MultichainFundingHistoryItem | undefined {
  const { pendingMultichainFunding } = useSyntheticsEvents();

  const pendingItem = useMemo((): MultichainFundingHistoryItem | undefined => {
    if (!guid) {
      return undefined;
    }
    return (
      pendingMultichainFunding.deposits.submitted.find((item) => item.id === guid) ??
      pendingMultichainFunding.deposits.sent[guid] ??
      pendingMultichainFunding.deposits.received[guid] ??
      pendingMultichainFunding.deposits.executed[guid]
    );
  }, [
    guid,
    pendingMultichainFunding.deposits.executed,
    pendingMultichainFunding.deposits.received,
    pendingMultichainFunding.deposits.sent,
    pendingMultichainFunding.deposits.submitted,
  ]);

  return pendingItem;
}

export function useGmxAccountFundingHistoryItem(
  guid: string | undefined,
  opts?: { refetch?: boolean }
): MultichainFundingHistoryItem | undefined {
  const { chainId } = useChainId();

  const { data } = useSWR(guid ? ["gmx-account-funding-history-item", guid] : null, {
    fetcher: () => fetchGmxAccountFundingHistory(chainId, { guid }),
    refreshInterval: opts?.refetch ? FREQUENT_UPDATE_INTERVAL : 0,
  });

  const currentItem = data?.[0];

  const pendingItem = useGmxAccountPendingFundingHistoryItem(guid);

  if (!currentItem && !pendingItem) {
    return undefined;
  }

  if (!currentItem && pendingItem) {
    return pendingItem;
  }

  if (currentItem && !pendingItem) {
    return currentItem;
  }

  return isStepGreaterOrEqual(currentItem!.step, pendingItem!.step) ? currentItem : pendingItem;
}
