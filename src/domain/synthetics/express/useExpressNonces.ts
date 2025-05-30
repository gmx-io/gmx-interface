import { useMemo } from "react";

import { UiContractsChain, UiSourceChain } from "config/chains";
import { useMulticall } from "lib/multicall";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { getExpressContractAddress } from "./relayParamsUtils";

export function useExpressNonces(
  chainId: UiContractsChain,
  {
    account,
    srcChainId,
  }: {
    account: string;
    srcChainId: UiSourceChain | undefined;
  }
) {
  const { data: onChainData, mutate } = useMulticall(chainId, "expressNonces", {
    key: [],
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    request: {
      relayRouter: {
        contractAddress: getExpressContractAddress(chainId, {
          isSubaccount: false,
          isMultichain: srcChainId !== undefined,
          // todo call for each scope
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
          isMultichain: srcChainId !== undefined,
          // todo call for each scope
          scope: "subaccount",
        }),
        abiId: "AbstractUserNonceable",
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
