import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountListKey,
} from "sdk/configs/dataStore";
import { MulticallRequestConfig } from "sdk/utils/multicall";

export type SubaccountOnchainData = {
  active: boolean;
  maxAllowedCount: bigint;
  currentActionsCount: bigint;
  expiresAt: bigint;
  approvalNonce: bigint;
};

export type SubaccountFromContractsRequest = {
  subaccountData: SubaccountOnchainData | undefined;
  refreshSubaccountData: () => void;
};

// TODO: make it work with multichain
export function useSubaccountFromContractsRequest(
  chainId: number,
  {
    account,
    subaccountAddress,
    srcChainId,
  }: {
    account: string | undefined;
    subaccountAddress: string | undefined;
    srcChainId: number | undefined;
  }
): SubaccountFromContractsRequest {
  const queryCondition = account && subaccountAddress;
  const { data, mutate } = useMulticall(chainId, "useSubaccountsFromContracts", {
    key: queryCondition ? [account, subaccountAddress, srcChainId] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,

    request: () => {
      if (!queryCondition) {
        return {} as any;
      }

      if (srcChainId) {
        console.log("requesting multichain info from multichain subaccount router");

        return {
          subaccountRelay: {
            contractAddress: getContract(chainId, "MultichainSubaccountRouter"),
            abiId: "MultichainSubaccountRouterArbitrumSepolia",
            calls: {
              nonce: {
                methodName: "subaccountApprovalNonces",
                params: [account],
              },
            },
          },
          dataStore: {
            contractAddress: getContract(chainId, "DataStore"),
            abiId: "DataStore",
            calls: {
              isSubaccountActive: {
                methodName: "containsAddress",
                params: [subaccountListKey(account!), subaccountAddress],
              },
              maxAllowedActionsCount: {
                methodName: "getUint",
                params: [maxAllowedSubaccountActionCountKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
              },
              currentActionsCount: {
                methodName: "getUint",
                params: [subaccountActionCountKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
              },
              expiresAt: {
                methodName: "getUint",
                params: [subaccountExpiresAtKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
              },
            },
          },
        } satisfies MulticallRequestConfig<any>;
      }

      return {
        subaccountRelay: {
          contractAddress: getContract(chainId, "SubaccountGelatoRelayRouter"),
          abiId: "SubaccountGelatoRelayRouter",
          calls: {
            nonce: {
              methodName: "subaccountApprovalNonces",
              params: [account],
            },
          },
        },
        dataStore: {
          contractAddress: getContract(chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            isSubaccountActive: {
              methodName: "containsAddress",
              params: [subaccountListKey(account!), subaccountAddress],
            },
            maxAllowedActionsCount: {
              methodName: "getUint",
              params: [maxAllowedSubaccountActionCountKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
            },
            currentActionsCount: {
              methodName: "getUint",
              params: [subaccountActionCountKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
            },
            expiresAt: {
              methodName: "getUint",
              params: [subaccountExpiresAtKey(account!, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
            },
          },
        },
      };
    },
    parseResponse: (res) => {
      const isSubaccountActive = Boolean(res.data.dataStore.isSubaccountActive.returnValues[0]);
      const maxAllowedCount = BigInt(res.data.dataStore.maxAllowedActionsCount.returnValues[0]);
      const currentActionsCount = BigInt(res.data.dataStore.currentActionsCount.returnValues[0]);
      const expiresAt = BigInt(res.data.dataStore.expiresAt.returnValues[0]);
      const nonce = BigInt(res.data.subaccountRelay.nonce.returnValues[0]);

      return { active: isSubaccountActive, maxAllowedCount, currentActionsCount, expiresAt, approvalNonce: nonce };
    },
  });

  return useMemo(() => {
    return {
      subaccountData: data,
      refreshSubaccountData: mutate,
    };
  }, [data, mutate]);
}
