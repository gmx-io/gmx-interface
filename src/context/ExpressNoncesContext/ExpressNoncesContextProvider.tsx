import { createContext, useContext, useMemo } from "react";

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
  subaccountRelayRouter: {
    nonce: bigint;
    lastEstimated: number;
  };
  subaccountApproval: {
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
  subaccountApproval: {
    count: 0,
    lastPerformed: 0,
  },
};

export function ExpressNoncesContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { account } = useWallet();

  const [localActionsPerformed, setLocalActionsPerformed] = useLocalStorageSerializeKey(
    ["expressNonces", account, chainId],
    defaultLocalActionsPerformed
  );

  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: [account],
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
          nonce: {
            methodName: "userNonces",
            params: [account],
          },
          subaccountApprovalNonce: {
            methodName: "subaccountApprovalNonces",
            params: [account],
          },
        },
      },
    },

    parseResponse: (result) => {
      const relayRouterNonce = result.data.relayRouter.nonce.returnValues[0];
      const subaccountRelayRouterNonce = result.data.subaccountRelayRouter.nonce.returnValues[0];
      const subaccountApprovalNonce = result.data.subaccountRelayRouter.subaccountApprovalNonce.returnValues[0];

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
          subaccountApproval: {
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
        subaccountRelayRouter: {
          nonce: subaccountRelayRouterNonce,
          lastEstimated: now,
        },
        subaccountApproval: {
          nonce: subaccountApprovalNonce,
          lastEstimated: now,
        },
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

    if (localActionsPerformed.relayRouter.lastPerformed > onChainData.relayRouter.lastEstimated) {
      result.relayRouter.nonce = onChainData.relayRouter.nonce + BigInt(localActionsPerformed.relayRouter.count);
      result.relayRouter.lastEstimated = localActionsPerformed.relayRouter.lastPerformed;
    }

    if (localActionsPerformed?.subaccountRelayRouter.lastPerformed > onChainData.subaccountRelayRouter.lastEstimated) {
      result.subaccountRelayRouter.nonce =
        onChainData.subaccountRelayRouter.nonce + BigInt(localActionsPerformed.subaccountRelayRouter.count);
      result.subaccountRelayRouter.lastEstimated = localActionsPerformed.subaccountRelayRouter.lastPerformed;
    }

    if (localActionsPerformed?.subaccountApproval.lastPerformed > onChainData.subaccountApproval.lastEstimated) {
      result.subaccountApproval.nonce =
        onChainData.subaccountApproval.nonce + BigInt(localActionsPerformed.subaccountApproval.count);
      result.subaccountApproval.lastEstimated = localActionsPerformed.subaccountApproval.lastPerformed;
    }

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
