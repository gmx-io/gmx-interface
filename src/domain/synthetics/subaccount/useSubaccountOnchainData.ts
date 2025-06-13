import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { ARBITRUM_SEPOLIA, ContractsChainId } from "sdk/configs/chains";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountIntegrationIdKey,
  subaccountListKey,
} from "sdk/configs/dataStore";
import { MulticallRequestConfig } from "sdk/utils/multicall";

export type SubaccountOnchainData = {
  active: boolean;
  maxAllowedCount: bigint;
  currentActionsCount: bigint;
  expiresAt: bigint;
  approvalNonce: bigint;
  integrationId: string | undefined;
};

export type SubaccountOnchainDataResult = {
  subaccountData: SubaccountOnchainData | undefined;
  refreshSubaccountData: () => void;
};

export function useSubaccountOnchainData(
  chainId: ContractsChainId,
  {
    account,
    subaccountAddress,
    srcChainId,
  }: {
    account: string | undefined;
    subaccountAddress: string | undefined;
    srcChainId: number | undefined;
  }
): SubaccountOnchainDataResult {
  const queryCondition = account && subaccountAddress !== undefined;

  const { data, mutate } = useMulticall(chainId, "useSubaccountOnchainData", {
    key: queryCondition ? [account, subaccountAddress, srcChainId] : null,
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    request: () => {
      if (!queryCondition) {
        return {} as any;
      }

      return {
        subaccountRelayRouter: {
          contractAddress: srcChainId
            ? getContract(chainId, "MultichainSubaccountRouter")
            : getContract(chainId, "SubaccountGelatoRelayRouter"),
          abiId: srcChainId ? "MultichainSubaccountRouterArbitrumSepolia" : "SubaccountGelatoRelayRouter",
          calls: {
            subaccountApproval: {
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
            integrationId:
              chainId === ARBITRUM_SEPOLIA
                ? {
                    methodName: "getBytes32",
                    params: [subaccountIntegrationIdKey(account!, subaccountAddress)],
                  }
                : null,
          },
        },
      } satisfies MulticallRequestConfig<any>;
    },
    parseResponse: (res) => {
      const isSubaccountActive = Boolean(res.data.dataStore.isSubaccountActive.returnValues[0]);
      const maxAllowedCount = BigInt(res.data.dataStore.maxAllowedActionsCount.returnValues[0]);
      const currentActionsCount = BigInt(res.data.dataStore.currentActionsCount.returnValues[0]);
      const expiresAt = BigInt(res.data.dataStore.expiresAt.returnValues[0]);
      const approvalNonce = BigInt(res.data.subaccountRelayRouter.subaccountApproval.returnValues[0]);

      const integrationId = chainId === ARBITRUM_SEPOLIA ? res.data.dataStore.integrationId.returnValues[0] : undefined;

      return {
        active: isSubaccountActive,
        maxAllowedCount,
        currentActionsCount,
        expiresAt,
        approvalNonce,
        integrationId,
      };
    },
  });

  return useMemo(() => {
    return {
      subaccountData: data,
      refreshSubaccountData: mutate,
    };
  }, [data, mutate]);
}
