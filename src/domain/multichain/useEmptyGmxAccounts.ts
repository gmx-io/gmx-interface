import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { useAccount } from "wagmi";

import { AVALANCHE, type SettlementChainId } from "config/chains";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { useChainId } from "lib/chains";
import { executeMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import {
  buildGmxAccountTokenBalancesRequest,
  parseGmxAccountTokenBalancesData,
} from "./gmxAccountTokenBalancesMulticallRequest";

const EXECUTE_MULTICALL_TIMEOUT = 60_000;

const subscribeEmptyGmxAccounts: SWRSubscription<
  [name: string, chainIds: SettlementChainId[], account: string],
  {
    emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>>;
    isLoading: boolean;
  }
> = (key, options) => {
  const [, chainIds, account] = key as [string, SettlementChainId[], string];

  const emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>> = {};
  const didLoadMap: Partial<Record<SettlementChainId, boolean>> = {};
  let disposed = false;
  let timeoutId: number | undefined;
  let requestTimeoutId: number | undefined;

  async function fetchAndScheduleNext() {
    if (disposed) return;

    if (getIsSolanaNetworkSelected()) {
      timeoutId = window.setTimeout(fetchAndScheduleNext, CONFIG_UPDATE_INTERVAL);
      return;
    }

    const deadline = new Promise<never>((_, reject) => {
      requestTimeoutId = window.setTimeout(
        () => reject(new Error("executeMulticall timeout")),
        EXECUTE_MULTICALL_TIMEOUT
      );
    });
    const results = await Promise.allSettled(
      chainIds.map(async (chainId) => {
        const req = buildGmxAccountTokenBalancesRequest(chainId, account);
        const res = await Promise.race([
          deadline,
          executeMulticall(chainId, req, didLoadMap[chainId] ? "background" : "urgent"),
        ]);
        if (disposed || getIsSolanaNetworkSelected()) return;

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

        options.next(null, {
          emptyGmxAccounts: { ...emptyGmxAccounts },
          isLoading: chainIds.some((id) => !didLoadMap[id]),
        });
      })
    );
    window.clearTimeout(requestTimeoutId);

    if (disposed) return;

    if (!getIsSolanaNetworkSelected()) {
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") {
        options.next(failure.reason);
      }
    }
    timeoutId = window.setTimeout(fetchAndScheduleNext, CONFIG_UPDATE_INTERVAL);
  }

  fetchAndScheduleNext();

  return () => {
    disposed = true;
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    if (requestTimeoutId !== undefined) {
      window.clearTimeout(requestTimeoutId);
    }
  };
};

export function useEmptyGmxAccounts(chainIds: SettlementChainId[] | undefined): {
  emptyGmxAccounts: Partial<Record<SettlementChainId, boolean>> | undefined;
  isLoading: boolean;
} {
  const { address: account } = useAccount();
  const isEnabled = !getIsSolanaNetworkSelected() && !!account && !!chainIds?.length;

  const { data } = useSWRSubscription(
    isEnabled ? ["emptyGmxAccounts", chainIds, account] : null,
    subscribeEmptyGmxAccounts
  );
  const emptyGmxAccounts = data?.emptyGmxAccounts;
  const isLoading = data?.isLoading;

  return {
    emptyGmxAccounts,
    isLoading: isEnabled && (isLoading ?? true),
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
