import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { gaslessFeatureDisabledKey } from "sdk/configs/dataStore";

export type FeaturesSettings = {
  relayRouterEnabled: boolean;
  subaccountRelayRouterEnabled: boolean;
};

export type EnabledFeaturesResult = {
  features: FeaturesSettings | undefined;
};

export function useEnabledFeaturesRequest(chainId: number): EnabledFeaturesResult {
  const { data } = useMulticall(chainId, "useEnabledFeatures", {
    key: [],
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: {
      features: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          // TODO: make it work with multichain
          relayRouterDisabled: {
            methodName: "getBool",
            params: [gaslessFeatureDisabledKey(getContract(chainId, "GelatoRelayRouter"))],
          },
          subaccountRelayRouterDisabled: {
            methodName: "getBool",
            params: [gaslessFeatureDisabledKey(getContract(chainId, "SubaccountGelatoRelayRouter"))],
          },
        },
      },
    },
    parseResponse: (result) => {
      return {
        relayRouterEnabled: !result.data.features.relayRouterDisabled.returnValues[0] as boolean,
        subaccountRelayRouterEnabled: !result.data.features.subaccountRelayRouterDisabled.returnValues[0] as boolean,
      };
    },
  });

  return useMemo(() => {
    if (!data) {
      return {
        features: {
          relayRouterEnabled: false,
          subaccountRelayRouterEnabled: false,
        },
      };
    }

    return {
      features: data,
    };
  }, [data]);
}
