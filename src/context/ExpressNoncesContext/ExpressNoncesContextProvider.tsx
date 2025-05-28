import { createContext, useContext, useMemo } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { getExpressContractAddress } from "domain/synthetics/express";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
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
  // TODO: todo
  multichainTransferRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
  multichainOrderRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
  multichainSubaccountRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
};

type ExpressNoncesContextType = {
  noncesData?: NoncesData;
  refreshNonces: () => void;
  updateActionsCount: (key: keyof typeof defaultLocalActionsPerformed) => void;
};

const ExpressNoncesContext = createContext<ExpressNoncesContextType | undefined>(undefined);

const defaultLocalActionsPerformed = {
  relayRouter: {
    count: 0,
    lastPerformed: 0,
  },
  subaccountRelayRouter: {
    count: 0,
    lastPerformed: 0,
  },
};

export function ExpressNoncesContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const { subaccount } = useSubaccountContext();

  const [localActionsPerformed, setLocalActionsPerformed] = useLocalStorageSerializeKey(
    ["expressNonces", account, chainId],
    defaultLocalActionsPerformed
  );

  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: [account, subaccount?.address],
    request: {
      relayRouter: {
        contractAddress: getExpressContractAddress(chainId, {
          isSubaccount: false,
          isMultichain: srcChainId !== undefined,
          // todo call for each scope
          scope: "order",
        }),
        abiId: "GelatoRelayRouter",
        calls: {
          nonce: {
            methodName: "userNonces",
            params: [account],
          },
        },
      },
      subaccountRelayRouter: {
        contractAddress: getExpressContractAddress(chainId, {
          isSubaccount: true,
          isMultichain: srcChainId !== undefined,
          scope: "subaccount",
        }),
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

      setLocalActionsPerformed((_) => {
        return {
          relayRouter: {
            count: 0,
            lastPerformed: now,
          },
          subaccountRelayRouter: {
            count: 0,
            lastPerformed: now,
          },
        };
      });

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

  const value = useMemo(() => {
    function updateActionsCount(key: keyof typeof defaultLocalActionsPerformed) {
      setLocalActionsPerformed((prev) => {
        if (!prev) {
          return undefined;
        }

        return {
          ...prev,
          [key]: {
            count: prev[key].count + 1,
            lastPerformed: Date.now(),
          },
        };
      });
    }

    if (!onChainData || !localActionsPerformed) {
      return {
        noncesData: undefined,
        refreshNonces: mutate,
        updateActionsCount,
      };
    }
    const result: NoncesData = onChainData;

    // if (localActionsPerformed.relayRouter.lastPerformed > onChainData.relayRouter.lastEstimated) {
    //   result.relayRouter.nonce = onChainData.relayRouter.nonce + BigInt(localActionsPerformed.relayRouter.count);
    //   result.relayRouter.lastEstimated = localActionsPerformed.relayRouter.lastPerformed;
    // }

    // if (localActionsPerformed?.subaccountRelayRouter.lastPerformed > onChainData.subaccountRelayRouter.lastEstimated) {
    //   result.subaccountRelayRouter.nonce =
    //     onChainData.subaccountRelayRouter.nonce + BigInt(localActionsPerformed.subaccountRelayRouter.count);
    //   result.subaccountRelayRouter.lastEstimated = localActionsPerformed.subaccountRelayRouter.lastPerformed;
    // }

    return {
      noncesData: result,
      refreshNonces: mutate,
      updateActionsCount,
    };
  }, [localActionsPerformed, mutate, onChainData, setLocalActionsPerformed]);

  return <ExpressNoncesContext.Provider value={value}>{children}</ExpressNoncesContext.Provider>;
}

export function useExpressNonces() {
  const context = useContext(ExpressNoncesContext);

  if (!context) {
    throw new Error("useExpressNonces must be used within ExpressNoncesContextProvider");
  }
  return context;
}
