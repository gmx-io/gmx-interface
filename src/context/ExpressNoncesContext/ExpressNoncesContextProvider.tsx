import { createContext, useContext, useMemo } from "react";

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

type ExpressNoncesContextType = {
  noncesData?: NoncesData;
  refreshNonces: () => void;
};

const ExpressNoncesContext = createContext<ExpressNoncesContextType | undefined>(undefined);

export function ExpressNoncesContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccount } = useSubaccountContext();

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
    if (!onChainData) {
      return {
        noncesData: undefined,
        refreshNonces: mutate,
      };
    }
    const result: NoncesData = onChainData;

    return {
      noncesData: result,
      refreshNonces: mutate,
    };
  }, [mutate, onChainData]);

  return <ExpressNoncesContext.Provider value={value}>{children}</ExpressNoncesContext.Provider>;
}

export function useExpressNonces() {
  const context = useContext(ExpressNoncesContext);

  if (!context) {
    throw new Error("useExpressNonces must be used within ExpressNoncesContextProvider");
  }
  return context;
}
