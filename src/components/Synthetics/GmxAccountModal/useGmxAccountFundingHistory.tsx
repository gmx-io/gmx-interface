import useSWR from "swr";
import { useAccount } from "wagmi";

import { getSubgraphUrl } from "config/subgraph";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { MultichainFundingHistoryItem } from "context/GmxAccountContext/types";
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
): Promise<MultichainFundingHistoryItem[] | undefined> {
  const subsquidUrl = getSubgraphUrl(chainId, "subsquid");

  if (!subsquidUrl) {
    return undefined;
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

export function useGmxAccountFundingHistory(): MultichainFundingHistoryItem[] | undefined {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { address: account } = useAccount();

  const { data } = useSWR(account ? ["gmx-account-funding-history", account] : null, {
    fetcher: () => fetchGmxAccountFundingHistory(settlementChainId, { account }),
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  return data;
}

export function useGmxAccountFundingHistoryItem(guid: string | undefined): MultichainFundingHistoryItem | undefined {
  const [settlementChainId] = useGmxAccountSettlementChainId();

  const { data } = useSWR(guid ? ["gmx-account-funding-history-item", guid] : null, () =>
    fetchGmxAccountFundingHistory(settlementChainId, { guid })
  );

  return data?.[0];
}
