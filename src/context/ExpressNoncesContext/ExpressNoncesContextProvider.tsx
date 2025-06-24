import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { isSettlementChain } from "domain/multichain/config";
import { getExpressContractAddress } from "domain/synthetics/express";
import { useChainId } from "lib/chains";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
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
  multichainTransferRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
  multichainOrderRouter?: {
    nonce: bigint;
    lastEstimated: number;
  };
  multichainSubaccountRelayRouter?: {
    nonce: bigint;
    nonceForMainAccount: bigint;
    lastEstimated: number;
  };
  multichainClaimsRouter?: {
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
  multichainOrderRouter: {
    actions: bigint;
    lastEstimated: number;
  };
  multichainSubaccountRelayRouter: {
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
  multichainOrderRouter: {
    actions: 0n,
    lastEstimated: 0,
  },
  multichainSubaccountRelayRouter: {
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

  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces-context", {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: account && [account, subaccount?.address],
    request: (chainId) => {
      const request: MulticallRequestConfig<any> = {
        relayRouter: {
          contractAddress: getExpressContractAddress(chainId, {
            scope: "order",
          }),
          abiId: "AbstractUserNonceable",
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
            scope: "subaccount",
          }),
          abiId: "AbstractUserNonceable",
          calls: {
            nonce: subaccount?.address
              ? {
                  methodName: "userNonces",
                  params: [subaccount?.address],
                }
              : undefined,
          },
        },
      };

      if (isSettlementChain(chainId)) {
        request.multichainTransferRouter = {
          contractAddress: getExpressContractAddress(chainId, {
            isMultichain: true,
            scope: "transfer",
          }),
          abiId: "AbstractUserNonceable",
          calls: {
            nonce: {
              methodName: "userNonces",
              params: [account],
            },
          },
        };
        request.multichainOrderRouter = {
          contractAddress: getExpressContractAddress(chainId, {
            isMultichain: true,
            scope: "order",
          }),
          abiId: "AbstractUserNonceable",
          calls: {
            nonce:
              chainId === ARBITRUM_SEPOLIA
                ? {
                    methodName: "userNonces",
                    params: [account],
                  }
                : undefined,
          },
        };
        request.multichainSubaccountRelayRouter = {
          contractAddress: getExpressContractAddress(chainId, {
            isMultichain: true,
            scope: "subaccount",
          }),
          abiId: "AbstractUserNonceable",
          calls: {
            nonce:
              chainId === ARBITRUM_SEPOLIA && subaccount?.address
                ? {
                    methodName: "userNonces",
                    params: [subaccount.address],
                  }
                : undefined,
            nonceForMainAccount:
              chainId === ARBITRUM_SEPOLIA
                ? {
                    methodName: "userNonces",
                    params: [account],
                  }
                : undefined,
          },
        };
        request.multichainClaimsRouter = {
          contractAddress: getExpressContractAddress(chainId, {
            isMultichain: true,
            scope: "claims",
          }),
          abiId: "AbstractUserNonceable",
          calls: {
            nonce: {
              methodName: "userNonces",
              params: [account],
            },
          },
        };
      }

      return request;
    },

    parseResponse: (result, chainId) => {
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
        multichainOrderRouter:
          chainId === ARBITRUM_SEPOLIA
            ? {
                nonce: result.data.multichainOrderRouter.nonce.returnValues[0],
                lastEstimated: now,
              }
            : undefined,
        multichainSubaccountRelayRouter:
          chainId === ARBITRUM_SEPOLIA && subaccount?.address
            ? ({
                nonce: result.data.multichainSubaccountRelayRouter.nonce.returnValues[0],
                nonceForMainAccount: result.data.multichainSubaccountRelayRouter.nonceForMainAccount.returnValues[0],
                lastEstimated: now,
              } satisfies NoncesData["multichainSubaccountRelayRouter"])
            : undefined,
        multichainTransferRouter:
          chainId === ARBITRUM_SEPOLIA
            ? {
                nonce: result.data.multichainTransferRouter.nonce.returnValues[0],
                lastEstimated: now,
              }
            : undefined,
        multichainClaimsRouter:
          chainId === ARBITRUM_SEPOLIA
            ? {
                nonce: result.data.multichainClaimsRouter.nonce.returnValues[0],
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
        result.multichainOrderRouter !== undefined &&
        localActions.multichainOrderRouter.lastEstimated > result.multichainOrderRouter.lastEstimated
      ) {
        result.multichainOrderRouter.nonce += localActions.multichainOrderRouter.actions;
        result.multichainOrderRouter.lastEstimated = localActions.multichainOrderRouter.lastEstimated;
      }

      if (
        result.subaccountRelayRouter &&
        localActions.subaccountRelayRouter.lastEstimated > result.subaccountRelayRouter.lastEstimated
      ) {
        result.subaccountRelayRouter.nonce += localActions.subaccountRelayRouter.actions;
        result.subaccountRelayRouter.lastEstimated = localActions.subaccountRelayRouter.lastEstimated;
      }

      if (
        result.multichainSubaccountRelayRouter !== undefined &&
        localActions.multichainSubaccountRelayRouter.lastEstimated >
          result.multichainSubaccountRelayRouter.lastEstimated
      ) {
        result.multichainSubaccountRelayRouter.nonce += localActions.multichainSubaccountRelayRouter.actions;
        result.multichainSubaccountRelayRouter.lastEstimated =
          localActions.multichainSubaccountRelayRouter.lastEstimated;
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
