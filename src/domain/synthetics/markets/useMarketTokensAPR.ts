import useSWR from "swr";
import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMarketTokensData } from "./useMarketTokensData";
import { useMarkets } from "./useMarkets";

type RawCollectedFee = {
  id: string;
  period: string;
  marketAddress: string;
  collateralTokenAddress: string;
  feeUsdForPool: string;
  timestampGroup: number;
};

type MarketTokensAPRData = {
  [marketAddress: string]: BigNumber;
};

export type MarketTokensAPRResult = {
  marketsTokensAPRData?: MarketTokensAPRData;
  avgMarketsAPR?: BigNumber;
};

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketsData } = useMarkets(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const client = getSyntheticsGraphClient(chainId);

  const marketAddresses = Object.keys(marketTokensData || {});

  const key = marketAddresses.length && client ? marketAddresses.join(",") : null;

  const { data } = useSWR(key, {
    fetcher: async () => {
      const getMarketQuery = (marketAddress: string, collateralTokenAddress: string) => `
        _${marketAddress}_${collateralTokenAddress}: collectedPositionFees(
            first: 7,
            orderBy: timestampGroup,
            orderDirection: desc,
            where: { marketAddress: "${marketAddress.toLowerCase()}", collateralTokenAddress: "${collateralTokenAddress.toLocaleLowerCase()}", period: "1d" }
        ) {
            id
            period
            marketAddress
            collateralTokenAddress
            feeUsdForPool
            timestampGroup
        }
      `;

      const queryBody = marketAddresses.reduce((acc, marketAddress) => {
        const { longTokenAddress, shortTokenAddress } = marketsData![marketAddress];

        acc += getMarketQuery(marketAddress, longTokenAddress);
        acc += getMarketQuery(marketAddress, shortTokenAddress);

        return acc;
      }, "");

      const { data: response } = await client!.query({ query: gql(`{${queryBody}}`) });

      const marketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const market = marketsData?.[marketAddress]!;
        const marketToken = marketTokensData?.[marketAddress]!;

        const feeItems = [
          ...response[`_${marketAddress}_${market.longTokenAddress}`],
          ...response[`_${marketAddress}_${market.shortTokenAddress}`],
        ];

        const feesUsdForPeriod = feeItems.reduce((acc, rawCollectedFee: RawCollectedFee) => {
          return acc.add(bigNumberify(rawCollectedFee.feeUsdForPool));
        }, BigNumber.from(0));

        const feesPerMarketToken = feesUsdForPeriod.mul(expandDecimals(1, 18)).div(marketToken.totalSupply);
        const weeksInYear = 52;
        const apr = feesPerMarketToken.mul(BASIS_POINTS_DIVISOR).div(marketToken.prices!.maxPrice).mul(weeksInYear);

        acc[marketAddress] = apr;

        return acc;
      }, {} as MarketTokensAPRData);

      const avgApr = Object.values(marketTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketTokensAPRData,
        avgMarketsAPR: avgApr,
      };
    },
  });

  return {
    marketsTokensAPRData: data?.marketTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}
