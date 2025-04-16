import { getIsFlagEnabled } from "config/ab";
import { GELATO_RELAY_FEE_MULTIPLIER_FACTOR_KEY } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { useMemo } from "react";
import { getContract } from "sdk/configs/contracts";
import useSWR from "swr";
import { getIsSponsoredCallAllowed } from "./expressOrderUtils";

export type SponsoredCallParams = {
  gelatoRelayFeeMultiplierFactor: bigint;
  isSponsoredCallAllowed: boolean;
};

export function useSponsoredCallParamsRequest(chainId: number): SponsoredCallParams | undefined {
  const { data: factors } = useMulticall(chainId, "useGelatoRelayFeeMultiplierRequest", {
    key: [],
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: {
      features: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          gelatoRelayFeeMultiplierFactor: {
            methodName: "getUint",
            params: [GELATO_RELAY_FEE_MULTIPLIER_FACTOR_KEY],
          },
        },
      },
    },

    parseResponse: (result) => {
      return {
        gelatoRelayFeeMultiplierFactor: result.data.features.gelatoRelayFeeMultiplierFactor.returnValues[0] as bigint,
      };
    },
  });

  const { data: isSponsoredCallAllowed } = useSWR<boolean>(["isSponsoredCallAllowed"], {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    fetcher: () => {
      return getIsSponsoredCallAllowed();
    },
  });

  return useMemo(() => {
    if (!factors) {
      return undefined;
    }

    return {
      gelatoRelayFeeMultiplierFactor: factors.gelatoRelayFeeMultiplierFactor,
      isSponsoredCallAllowed: getIsFlagEnabled("testSponsoredCall") ? Boolean(isSponsoredCallAllowed) : false,
    };
  }, [factors, isSponsoredCallAllowed]);
}
