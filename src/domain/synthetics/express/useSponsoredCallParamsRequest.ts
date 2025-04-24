import { useMemo } from "react";
import useSWR from "swr";

import { getIsFlagEnabled } from "config/ab";
import { GELATO_RELAY_FEE_MULTIPLIER_FACTOR_KEY } from "config/dataStore";
import { convertToUsd, TokensData } from "domain/tokens";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { getContract } from "sdk/configs/contracts";
import { MIN_GELATO_BALANCE_FOR_SPONSORED_CALL } from "sdk/configs/express";

export type SponsoredCallParams = {
  gelatoRelayFeeMultiplierFactor: bigint;
  isSponsoredCallAllowed: boolean;
};

export function useSponsoredCallParamsRequest(
  chainId: number,
  { tokensData }: { tokensData: TokensData | undefined }
): SponsoredCallParams | undefined {
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

  const { data: isSponsoredCallAllowed } = useSWR<boolean>(tokensData ? ["isSponsoredCallAllowed"] : null, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    fetcher: async () => {
      if (!getIsFlagEnabled("testSponsoredCall")) {
        return false;
      }

      const gelatoBalance = await fetch(
        "https://api.gelato.digital/1balance/networks/mainnets/sponsors/0x88FcCAC36031949001Df4bB0b68CBbd07f033161"
      );

      const gelatoBalanceData = await gelatoBalance.json();

      const mainBalance = gelatoBalanceData.sponsor.mainBalance;
      const mainBalanceToken = mainBalance.token;
      const remainingBalance = BigInt(mainBalance.remainingBalance);

      const mainBalanceTokenData = getByKey(tokensData, mainBalanceToken.address);
      const usdBalance = convertToUsd(
        remainingBalance,
        mainBalanceToken.decimals,
        mainBalanceTokenData?.prices.minPrice
      );

      console.log("usdBalance", usdBalance);

      return usdBalance !== undefined && usdBalance > MIN_GELATO_BALANCE_FOR_SPONSORED_CALL;
    },
  });

  return useMemo(() => {
    if (!factors) {
      return undefined;
    }

    return {
      gelatoRelayFeeMultiplierFactor: factors.gelatoRelayFeeMultiplierFactor,
      isSponsoredCallAllowed: Boolean(isSponsoredCallAllowed),
    };
  }, [factors, isSponsoredCallAllowed]);
}
