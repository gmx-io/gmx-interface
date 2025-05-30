import { useMemo } from "react";
import useSWR from "swr";

import { getIsFlagEnabled } from "config/ab";
import { convertToUsd, TokensData } from "domain/tokens";
import { getByKey } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { MIN_GELATO_USD_BALANCE_FOR_SPONSORED_CALL } from "sdk/configs/express";
import { getTokenBySymbol } from "sdk/configs/tokens";

export type SponsoredCallBalanceData = {
  isSponsoredCallAllowed: boolean;
};

export function useIsSponsoredCallBalanceAvailable(
  chainId: number,
  { tokensData }: { tokensData: TokensData | undefined }
): SponsoredCallBalanceData {
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

      const mainBalanceTokenData = getByKey(tokensData, getTokenBySymbol(chainId, mainBalanceToken.symbol).address);

      const usdBalance = convertToUsd(
        remainingBalance,
        mainBalanceToken.decimals,
        mainBalanceTokenData?.prices.minPrice
      );

      return usdBalance !== undefined && usdBalance > MIN_GELATO_USD_BALANCE_FOR_SPONSORED_CALL;
    },
  });

  return useMemo(() => {
    return {
      isSponsoredCallAllowed: Boolean(isSponsoredCallAllowed),
    };
  }, [isSponsoredCallAllowed]);
}
