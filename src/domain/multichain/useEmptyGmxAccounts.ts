import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { useAccount } from "wagmi";

import { AVALANCHE, SettlementChainId } from "config/chains";
import { useChainId } from "lib/chains";
import { executeMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import {
  buildGmxAccountTokenBalancesRequest,
  parseGmxAccountTokenBalancesData,
} from "./gmxAccountTokenBalancesMulticallRequest";

const subscribeEmptyGmxAccounts: SWRSubscription<
  [name: string, chainIds: SettlementChainId[], account: string],
  {
    emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>>;
    isLoading: boolean;
  }
> = (key, options) => {
  const [, chainIds, account] = key as [string, SettlementChainId[], string];

  const emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>> = {};
  let isLoaded = false;
  const didLoadMap: Partial<Record<SettlementChainId, boolean>> = {};

  function fetchEmptyGmxAccounts() {
    const requests = chainIds.map(async (chainId) => {
      const req = buildGmxAccountTokenBalancesRequest(chainId, account);
      const res = await executeMulticall(chainId, req, didLoadMap[chainId] ? "background" : "urgent");
      const parsedRes = parseGmxAccountTokenBalancesData(res);
      let isEmpty = true;
      for (const balance of Object.values(parsedRes)) {
        if (balance > 0n) {
          isEmpty = false;
          break;
        }
      }

      emptyGmxAccounts[chainId] = isEmpty;
      didLoadMap[chainId] = true;

      options.next(null, { emptyGmxAccounts, isLoading: !isLoaded });
    });

    Promise.all(requests).then(() => {
      if (!isLoaded) {
        isLoaded = true;
        options.next(null, { emptyGmxAccounts, isLoading: !isLoaded });
      }
    });
  }

  let timeoutId: number | undefined;

  const fetchAndScheduleNext = () => {
    fetchEmptyGmxAccounts();
    timeoutId = window.setTimeout(fetchAndScheduleNext, CONFIG_UPDATE_INTERVAL);
  };

  fetchAndScheduleNext();

  return () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
};

export function useEmptyGmxAccounts(chainIds: SettlementChainId[] | undefined): {
  emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>> | undefined;
  isLoading: boolean;
} {
  const { address: account } = useAccount();

  const { data } = useSWRSubscription(
    account && chainIds && chainIds.length > 0 ? ["emptyGmxAccounts", chainIds, account] : null,
    subscribeEmptyGmxAccounts
  );
  const emptyGmxAccounts = data?.emptyGmxAccounts;
  const isLoading = data?.isLoading;

  return {
    emptyGmxAccounts,
    isLoading: isLoading ?? true,
  };
}

export function useEmptyAvalancheGmxAccount(): {
  isEmptyAvalancheGmxAccountOrNotConnected: boolean;
} {
  const { chainId: settlementChainId } = useChainId();
  const { emptyGmxAccounts } = useEmptyGmxAccounts([AVALANCHE]);
  const { isConnected } = useAccount();

  const isAvalancheSettlement = settlementChainId === AVALANCHE;
  const isAvalancheEmpty = emptyGmxAccounts?.[AVALANCHE] === true;
  const isEmptyAvalancheGmxAccount = isAvalancheSettlement && isAvalancheEmpty;
  const isEmptyAvalancheGmxAccountOrNotConnected = isEmptyAvalancheGmxAccount || !isConnected;

  return {
    isEmptyAvalancheGmxAccountOrNotConnected,
  };
}
