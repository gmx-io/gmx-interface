import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { getExpressContractAddress } from "domain/synthetics/express";
import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";

export type NoncesData = {
  relayRouter: {
    nonce: bigint;
    lastEstimated: number;
  };
  subaccountRelayRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
};

export type LocalActions = {
  relayRouter: {
    actions: bigint;
    lastEstimated: number;
  };
  subaccountRelayRouter: {
    actions: bigint;
    lastEstimated: number;
  };
};

const defaultLocalActions: LocalActions = {
  relayRouter: {
    actions: 0n,
    lastEstimated: 0,
  },
  subaccountRelayRouter: {
    actions: 0n,
    lastEstimated: 0,
  },
};

type ExpressNoncesContextType = {
  noncesData?: NoncesData;
  refreshNonces: () => void;
  updateLocalAction: (action: keyof LocalActions, actions: bigint) => void;
};

const ExpressNoncesContext = createContext<ExpressNoncesContextType | undefined>(undefined);

export function ExpressNoncesContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccount } = useSubaccountContext();
  const [localActions, setLocalActions] = useState<LocalActions>(defaultLocalActions);

  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: [account, subaccount?.address],
    request: {
      relayRouter: {
        contractAddress: getExpressContractAddress(chainId, { isSubaccount: false }),
        abiId: "GelatoRelayRouter",
        calls: {
          nonce: {
            methodName: "userNonces",
            params: [account],
          },
        },
      },
      subaccountRelayRouter: {
        contractAddress: getExpressContractAddress(chainId, { isSubaccount: true }),
        abiId: "SubaccountGelatoRelayRouter",
        calls: {
          nonce: subaccount?.address
            ? {
                methodName: "userNonces",
                params: [subaccount?.address],
              }
            : undefined,
        },
      },
    },

    parseResponse: (result) => {
      const relayRouterNonce = result.data.relayRouter.nonce.returnValues[0];
      const subaccountRelayRouterNonce = result.data.subaccountRelayRouter?.nonce?.returnValues[0];

      const now = Date.now();

      setLocalActions(defaultLocalActions);

      return {
        relayRouter: {
          nonce: relayRouterNonce,
          lastEstimated: now,
        },
        subaccountRelayRouter: subaccountRelayRouterNonce
          ? {
              nonce: subaccountRelayRouterNonce,
              lastEstimated: now,
            }
          : undefined,
      };
    },
  });

  const updateLocalAction = useCallback((action: keyof LocalActions, actions: bigint) => {
    setLocalActions((old) => ({
      ...old,
      [action]: {
        actions,
        lastEstimated: Date.now(),
      },
    }));
  }, []);

  const value = useMemo(() => {
    let result: NoncesData | undefined;

    if (onChainData) {
      result = { ...onChainData };

      if (localActions.relayRouter.lastEstimated > result.relayRouter.lastEstimated) {
        result.relayRouter.nonce += localActions.relayRouter.actions;
        result.relayRouter.lastEstimated = localActions.relayRouter.lastEstimated;
      }

      if (
        result.subaccountRelayRouter &&
        localActions.subaccountRelayRouter.lastEstimated > result.subaccountRelayRouter.lastEstimated
      ) {
        result.subaccountRelayRouter.nonce += localActions.subaccountRelayRouter.actions;
        result.subaccountRelayRouter.lastEstimated = localActions.subaccountRelayRouter.lastEstimated;
      }
    }

    return {
      noncesData: result,
      updateLocalAction,
      refreshNonces: mutate,
    };
  }, [localActions, mutate, onChainData, updateLocalAction]);

  return <ExpressNoncesContext.Provider value={value}>{children}</ExpressNoncesContext.Provider>;
}

export function useExpressNonces() {
  const context = useContext(ExpressNoncesContext);

  if (!context) {
    throw new Error("useExpressNonces must be used within ExpressNoncesContextProvider");
  }
  return context;
}
