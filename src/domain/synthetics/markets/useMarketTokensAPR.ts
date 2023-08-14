import { gql } from "@apollo/client";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { BigNumber } from "ethers";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfo } from ".";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";

type RawCollectedFees = {
  id: string;
  period: string;
  marketAddress: string;
  tokenAddress: string;
  feeUsdForPool: string;
  cummulativeFeeUsdForPool: string;
  timestampGroup: number;
};

type MarketTokensAPRResult = {
  marketsTokensAPRData?: MarketTokensAPRData;
  avgMarketsAPR?: BigNumber;
};

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const client = getSyntheticsGraphClient(chainId);
  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const key = marketAddresses.length && marketTokensData && client ? marketAddresses.join(",") : null;

  const { data } = useSWR(key, {
    fetcher: async () => {
      const nowInSecods = Math.floor(Date.now() / 1000);

      const marketFeesQuery = (marketAddress: string, tokenAddress: string) => `
            _${marketAddress}_${tokenAddress}: collectedMarketFeesInfos(
               where: {
                    marketAddress: "${marketAddress.toLowerCase()}",
                    tokenAddress: "${tokenAddress.toLowerCase()}",
                    period: "1h",
                    timestampGroup_gte: ${nowInSecods - 3600 * 24 * 7}
                },
                orderBy: timestampGroup,
                orderDirection: desc,
                first: 1000
            ) {
                id
                period
                marketAddress
                tokenAddress
                feeUsdForPool
                cummulativeFeeUsdForPool
                timestampGroup
            }
        `;

      const queryBody = marketAddresses.reduce((acc, marketAddress) => {
        const { longTokenAddress, shortTokenAddress } = marketsInfoData![marketAddress];

        acc += marketFeesQuery(marketAddress, longTokenAddress);
        acc += marketFeesQuery(marketAddress, shortTokenAddress);

        return acc;
      }, "");

      const { data: response } = await client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" });

      const marketTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const market = marketsInfoData![marketAddress]!;
        const marketToken = marketTokensData![marketAddress]!;

        const feeItems = [
          ...response[`_${marketAddress}_${market.longTokenAddress}`],
          ...response[`_${marketAddress}_${market.shortTokenAddress}`],
        ];

        const feesUsdForPeriod = feeItems.reduce((acc, rawCollectedFees: RawCollectedFees) => {
          return acc.add(bigNumberify(rawCollectedFees.feeUsdForPool));
        }, BigNumber.from(0));

        if (marketToken.totalSupply?.gt(0)) {
          const feesPerMarketToken = feesUsdForPeriod.mul(expandDecimals(1, 18)).div(marketToken.totalSupply);
          const weeksInYear = 52;
          const apr = feesPerMarketToken.mul(BASIS_POINTS_DIVISOR).mul(weeksInYear).div(marketToken.prices.minPrice);

          acc[marketAddress] = apr;
        } else {
          acc[marketAddress] = BigNumber.from(0);
        }

        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketsTokensAPRData: marketTokensAPRData,
        avgMarketsAPR: avgMarketsAPR,
      };
    },
  });

  return {
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}
