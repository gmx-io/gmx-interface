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

export function useGmxAccountFundingHistory(): MultichainFundingHistoryItem[] | undefined {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const { pendingMultichainFunding } = useSyntheticsEvents();

  const { data } = useSWR<MultichainFundingHistoryItem[]>(account ? ["gmx-account-funding-history", account] : null, {
    fetcher: () => fetchGmxAccountFundingHistory(chainId, { account }),
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  // console.log({ pendingMultichainFunding });

  const mergedData = useMemo(() => {
    let mergedData = data ? [...data] : [];

    for (const step of ["executed", "received", "sent"] as const) {
      for (const sentGuid in pendingMultichainFunding.deposits[step]) {
        const currentIndex = mergedData.findIndex((item) => item.id === sentGuid);

        if (currentIndex === -1) {
          mergedData.unshift({ ...pendingMultichainFunding.deposits[step][sentGuid], isFromWs: true });
          continue;
        }

        const current = mergedData[currentIndex];

        if (isStepGreaterOrEqual(current.step, step)) {
          continue;
        }

        mergedData[currentIndex] = {
          ...mergedData[currentIndex],
          ...pendingMultichainFunding.deposits[step][sentGuid],
          isFromWs: true,
        };
      }
    }

    const submitted = pendingMultichainFunding.deposits.submitted.map((item) => ({ ...item, isFromWs: true }));
    mergedData = [...submitted, ...mergedData];

    mergedData.sort((a, b) => b.sentTimestamp - a.sentTimestamp);

    return mergedData;
  }, [data, pendingMultichainFunding.deposits]);

  return mergedData;
}

export function useGmxAccountFundingHistoryItem(guid: string | undefined): MultichainFundingHistoryItem | undefined {
  const { chainId } = useChainId();

  const { data } = useSWR(guid ? ["gmx-account-funding-history-item", guid] : null, () =>
    fetchGmxAccountFundingHistory(chainId, { guid })
  );

  return data?.[0];
}
