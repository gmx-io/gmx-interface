import { useMemo } from "react";
import useSWR from "swr";

import { getSubgraphUrl } from "config/subgraph";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

const MAX_TRADE_ACTIONS_COUNT = 30;

const QUERY = /* gql */ `
  query($account: String!) {
    tradeActionsConnection(orderBy: id_ASC, where: {AND: [{account_eq: $account}, {OR: [{eventName_eq: "OrderExecuted", orderType_eq: 4, twapGroupId_isNull: true, sizeDeltaUsd_not_eq: 0}, {eventName_eq: "OrderExecuted", orderType_eq: 5, twapGroupId_isNull: true}, {eventName_eq: "OrderExecuted", orderType_eq: 6, twapGroupId_isNull: true}, {eventName_eq: "OrderExecuted", orderType_eq: 7, twapGroupId_isNull: true}]}, {OR: [{orderType_not_eq: 7}, {eventName_not_eq: "OrderCreated"}]}, {OR: [{orderType_not_eq: 2}, {eventName_not_eq: "OrderCreated"}]}, {OR: [{orderType_not_eq: 4}, {eventName_not_eq: "OrderCreated"}]}, {OR: [{orderType_not_eq: 0}, {eventName_not_eq: "OrderCreated"}]}]}) {
      totalCount
    }
  }
`;

export function useIsFreshAccountForHighLeverageTrading() {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);

  const { data, isLoading } = useSWR<number>(account ? [chainId, account] : null, {
    refreshInterval: undefined,
    fetcher: () => {
      const endpoint = getSubgraphUrl(chainId, "subsquid");

      if (!endpoint) {
        throw new Error("Subgraph endpoint not found");
      }

      return graphqlFetcher(endpoint, QUERY, { account }).then((res: any) => res?.tradeActionsConnection?.totalCount);
    },
  });

  const isFreshAccount = useMemo(() => {
    return !isLoading && data !== undefined && data < MAX_TRADE_ACTIONS_COUNT;
  }, [isLoading, data]);

  return isFreshAccount;
}
