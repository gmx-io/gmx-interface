import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { gaslessFeatureDisabledKey, withdrawalSwapFeatureDisabledKey } from "sdk/configs/dataStore";

export type FeaturesSettings = {
  relayRouterEnabled: boolean;
  subaccountRelayRouterEnabled: boolean;
  withdrawalSwapEnabled: boolean;
  glvWithdrawalSwapEnabled: boolean;
};

export type EnabledFeaturesResult = {
  features: FeaturesSettings | undefined;
};

export function useEnabledFeaturesRequest(chainId: ContractsChainId): EnabledFeaturesResult {
  const { data } = useMulticall(chainId, "useEnabledFeatures", {
    key: [],
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: {
      features: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          relayRouterDisabled: {
            methodName: "getBool",
            params: [gaslessFeatureDisabledKey(getContract(chainId, "GelatoRelayRouter"))],
          },
          subaccountRelayRouterDisabled: {
            methodName: "getBool",
            params: [gaslessFeatureDisabledKey(getContract(chainId, "SubaccountGelatoRelayRouter"))],
          },
          withdrawalSwapDisabled: {
            methodName: "getBool",
            params: [withdrawalSwapFeatureDisabledKey(getContract(chainId, "WithdrawalHandler"))],
          },
          glvWithdrawalSwapDisabled: {
            methodName: "getBool",
            params: [withdrawalSwapFeatureDisabledKey(getContract(chainId, "GlvWithdrawalHandler"))],
          },
        },
      },
    },
    parseResponse: (result) => {
      return {
        relayRouterEnabled: !result.data.features.relayRouterDisabled.returnValues[0] as boolean,
        subaccountRelayRouterEnabled: !result.data.features.subaccountRelayRouterDisabled.returnValues[0] as boolean,
        withdrawalSwapEnabled: !result.data.features.withdrawalSwapDisabled.returnValues[0] as boolean,
        glvWithdrawalSwapEnabled: !result.data.features.glvWithdrawalSwapDisabled.returnValues[0] as boolean,
      };
    },
  });

  return useMemo(() => ({ features: data }), [data]);
}
