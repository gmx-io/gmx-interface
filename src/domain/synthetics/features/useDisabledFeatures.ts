import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { gaslessFeatureDisabledKey } from "sdk/configs/dataStore";

export type DisabledFeatures = {
  relayRouterDisabled: boolean;
  subaccountRelayRouterDisabled: boolean;
};

export type DisabledFeaturesResult = {
  disabledFeatures: DisabledFeatures | undefined;
};

export function useDisabledFeaturesRequest(chainId: number): DisabledFeaturesResult {
  const { data } = useMulticall(chainId, "useDisabledFeatures", {
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
        relayRouterDisabled: result.data.features.relayRouterDisabled.returnValues[0] as boolean,
        subaccountRelayRouterDisabled: result.data.features.subaccountRelayRouterDisabled.returnValues[0] as boolean,
      };
    },
  });

  return useMemo(() => {
    if (!data) {
      return {
        disabledFeatures: {
          relayRouterDisabled: true,
          subaccountRelayRouterDisabled: true,
        },
      };
    }

    return {
      disabledFeatures: data,
    };
  }, [data]);
}
