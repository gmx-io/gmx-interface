import { gql } from "@apollo/client";
import { sub } from "date-fns";
import { BigNumber } from "ethers";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfo } from ".";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";

type RawCollectedFees = {
  cumulativeFeeUsdPerPoolValue: string;
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

  const daysConsidered = useDaysConsideredInMarketsApr();

  const { data } = useSWR(key, {
    fetcher: async () => {
      const marketFeesQuery = (marketAddress: string) => {
        return `
            _${marketAddress}_lte_start_of_period_: collectedMarketFeesInfos(
                orderBy:timestampGroup
                orderDirection:desc
                where: {
                  marketAddress: "${marketAddress.toLowerCase()}"
                  period: "1h"
                  timestampGroup_lte: ${Math.floor(sub(new Date(), { days: daysConsidered }).valueOf() / 1000)}
                },
                first: 1
            ) {
                cumulativeFeeUsdPerPoolValue
            }

            _${marketAddress}_recent: collectedMarketFeesInfos(
              orderBy: timestampGroup
              orderDirection: desc
              where: {
                marketAddress: "${marketAddress.toLowerCase()}"
                period: "1h"
              },
              first: 1
          ) {
              cumulativeFeeUsdPerPoolValue
          }
        `;
      };

      const queryBody = marketAddresses.reduce((acc, marketAddress) => acc + marketFeesQuery(marketAddress), "");
      const { data: response } = await client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" });

      const marketTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`] as RawCollectedFees[];
        const recentFees = response[`_${marketAddress}_recent`] as RawCollectedFees[];

        const lteStartOfPeriodFeePerPoolValue =
          bigNumberify(lteStartOfPeriodFees[0]!.cumulativeFeeUsdPerPoolValue) ?? BigNumber.from(0);
        const recentFeePerPoolValue = bigNumberify(recentFees[0]!.cumulativeFeeUsdPerPoolValue);

        if (!recentFeePerPoolValue) {
          acc[marketAddress] = BigNumber.from(0);
          return acc;
        }

        const incomePercentageForPeriod = recentFeePerPoolValue.sub(lteStartOfPeriodFeePerPoolValue);
        const yearMultiplier = Math.floor(365 / daysConsidered);
        const apr = incomePercentageForPeriod.mul(yearMultiplier).div(expandDecimals(1, 26));

        acc[marketAddress] = apr;

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
