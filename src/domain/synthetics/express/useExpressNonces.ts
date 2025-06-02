import { useMemo } from "react";

import { useMulticall } from "lib/multicall";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { getExpressContractAddress } from "./relayParamsUtils";

export function useExpressNonces(
  chainId: number,
  {
    account,
  }: {
    account: string;
  }
) {
  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    key: [],
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
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
    return {
      noncesData: onChainData,
      refreshNonces: mutate,
    };
  }, [mutate, onChainData]);
}
