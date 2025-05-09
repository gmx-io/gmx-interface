import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { getExpressContractAddress } from "./relayParamsUtils";

export function useExpressNonces(
  chainId: number,
  {
    account,
  }: {
    account: string;
  }
) {
  const [localActionsPerformed, setLocalActionsPerformed] = useLocalStorageSerializeKey("expressNonces", {
    relayRouter: {
      count: 0,
      lastPerformed: 0,
    },
    subaccountRelayRouter: {
      count: 0,
      lastPerformed: 0,
    },
    subaccountApprovalNonce: {
      count: 0,
      lastPerformed: 0,
    },
  });

  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    key: [],
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
          subaccountApprovalNonce: {
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
        subaccountApprovalNonce: {
          nonce: subaccountApprovalNonce,
          lastEstimated: now,
        },
      };
    },
  });

  return useMemo(() => {
    const result: {
      relayRouterNonce: {
        nonce: bigint;
        lastEstimated: number;
      };
      subaccountRelayRouterNonce: {
        nonce: bigint;
        lastEstimated: number;
      };
      subaccountApprovalNonce: {
        nonce: bigint;
        lastEstimated: number;
      };
    } = {
      relayRouterNonce: {
        nonce: 0n,
        lastEstimated: 0,
      },
      subaccountRelayRouterNonce: {
        nonce: 0n,
        lastEstimated: 0,
      },
      subaccountApprovalNonce: {
        nonce: 0n,
        lastEstimated: 0,
      },
    };

    if (!onChainData || !localActionsPerformed) {
      return undefined;
    }

    if (localActionsPerformed.relayRouter.lastPerformed > onChainData.relayRouter.lastEstimated) {
      result.relayRouterNonce.nonce = onChainData.relayRouter.nonce + BigInt(localActionsPerformed.relayRouter.count);
      result.relayRouterNonce.lastEstimated = localActionsPerformed.relayRouter.lastPerformed;
    }

    if (localActionsPerformed?.subaccountRelayRouter.lastPerformed > onChainData.subaccountRelayRouter.lastEstimated) {
      result.subaccountRelayRouterNonce.nonce =
        onChainData.subaccountRelayRouter.nonce + BigInt(localActionsPerformed.subaccountRelayRouter.count);
      result.subaccountRelayRouterNonce.lastEstimated = localActionsPerformed.subaccountRelayRouter.lastPerformed;
    }

    if (
      localActionsPerformed?.subaccountApprovalNonce.lastPerformed > onChainData.subaccountApprovalNonce.lastEstimated
    ) {
      result.subaccountApprovalNonce.nonce =
        onChainData.subaccountApprovalNonce.nonce + BigInt(localActionsPerformed.subaccountApprovalNonce.count);
      result.subaccountApprovalNonce.lastEstimated = localActionsPerformed.subaccountApprovalNonce.lastPerformed;
    }

    return {
      noncesData: result,
      refreshNonces: mutate,
    };
  }, [localActionsPerformed, mutate, onChainData]);
}
