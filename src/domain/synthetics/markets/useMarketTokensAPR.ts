import { gql } from "@apollo/client";
import { ARBITRUM, ARBITRUM_GOERLI } from "config/chains";
import { getTokenBySymbol } from "config/tokens";
import { sub } from "date-fns";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { getSubsquidGraphClient, getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfoRequest } from ".";
import { useTokensDataRequest } from "../tokens";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";
import { getByKey } from "lib/objects";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import useIncentiveStats from "../common/useIncentiveStats";
import { getBorrowingFactorPerPeriod } from "../fees";
import { CHART_PERIODS } from "lib/legacy";

type RawCollectedFee = {
  cumulativeFeeUsdPerPoolValue: string;
  cumulativeBorrowingFeeUsdPerPoolValue: string;
};

type MarketTokensAPRResult = {
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensAPRData?: MarketTokensAPRData;
  avgMarketsAPR?: BigNumber;
};

type SwrResult = {
  marketsTokensAPRData: MarketTokensAPRData;
  avgMarketsAPR: BigNumber;
};

function useMarketAddresses(chainId: number) {
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  return useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );
}

function useIncentivesBonusApr(chainId: number): MarketTokensAPRData {
  const marketAddresses = useMarketAddresses(chainId);

  return useMemo(() => {
    return marketAddresses.reduce((acc, marketAddress) => {
      return {
        ...acc,
        [marketAddress]: BigNumber.from(0),
      };
    }, {} as MarketTokensAPRData);
  }, [marketAddresses]);
}

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const marketAddresses = useMarketAddresses(chainId);

  const client = getSyntheticsGraphClient(chainId);

  const key = marketAddresses.length && marketTokensData && client ? marketAddresses.concat("apr").join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();

  const { data } = useSWR<SwrResult>(key, {
    fetcher: async (): Promise<SwrResult> => {
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
      let responseOrNull: Record<string, [RawCollectedFee]> | null = null;
      try {
        responseOrNull = (await client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" })).data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      if (!responseOrNull) {
        return {
          marketsTokensAPRData: {},
          avgMarketsAPR: BigNumber.from(0),
        };
      }

      const response = responseOrNull;

      const marketsTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`];
        const recentFees = response[`_${marketAddress}_recent`];

        const x1 = BigNumber.from(lteStartOfPeriodFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x2 = BigNumber.from(recentFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);

        if (x2.eq(0)) {
          acc[marketAddress] = BigNumber.from(0);
          return acc;
        }

        const incomePercentageForPeriod = x2.sub(x1);
        const yearMultiplier = Math.floor(365 / daysConsidered);
        const apr = incomePercentageForPeriod.mul(yearMultiplier).mul(100);

        acc[marketAddress] = apr;

        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketsTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketsTokensAPRData,
        avgMarketsAPR,
      };
    },
  });

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId);

  return {
    marketsTokensIncentiveAprData,
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}

export function useMarketTokensAPR2(chainId: number): MarketTokensAPRResult {
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const marketAddresses = useMarketAddresses(chainId);
  // FIXME
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const client = getSubsquidGraphClient(chainId);

  const key =
    marketAddresses.length && marketTokensData && client ? marketAddresses.concat("apr-subsquid").join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();

  console.log(">>>>>>>>>>>");
  const { data } = useSWR<SwrResult>(key, {
    fetcher: async (): Promise<SwrResult> => {
      const marketFeesQuery = (marketAddress: string) => {
        console.log("Xxxx");
        return `
            _${marketAddress}_lte_start_of_period_: collectedMarketFeesInfos(
                orderBy:timestampGroup_DESC
                where: {
                  marketAddress_eq: "${marketAddress}"
                  period_eq: "1h"
                  timestampGroup_lte: ${Math.floor(sub(new Date(), { days: daysConsidered }).valueOf() / 1000)}
                },
                limit: 1
            ) {
                cumulativeFeeUsdPerPoolValue
                cumulativeBorrowingFeeUsdPerPoolValue
            }

            _${marketAddress}_recent: collectedMarketFeesInfos(
              orderBy:timestampGroup_DESC
              where: {
                marketAddress_eq: "${marketAddress}"
                period_eq: "1h"
              },
              limit: 1
          ) {
              cumulativeFeeUsdPerPoolValue
              cumulativeBorrowingFeeUsdPerPoolValue
          }
        `;
      };

      const queryBody = marketAddresses.reduce((acc, marketAddress) => acc + marketFeesQuery(marketAddress), "");
      let responseOrNull: Record<string, [RawCollectedFee]> | null = null;
      try {
        responseOrNull = (await client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" })).data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      if (!responseOrNull) {
        return {
          marketsTokensAPRData: {},
          avgMarketsAPR: BigNumber.from(0),
        };
      }

      const response = responseOrNull;

      const marketsTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`];
        const recentFees = response[`_${marketAddress}_recent`];

        const marketInfo = getByKey(marketsInfoData, marketAddress);
        if (!marketInfo) return acc;

        const borrowingFactorPerYear = getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1y"]).add(
          getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1y"])
        );

        const x1total = BigNumber.from(lteStartOfPeriodFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x1borrowing = BigNumber.from(lteStartOfPeriodFees[0]?.cumulativeBorrowingFeeUsdPerPoolValue ?? 0);
        const x2total = BigNumber.from(recentFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x2borrowing = BigNumber.from(recentFees[0]?.cumulativeBorrowingFeeUsdPerPoolValue ?? 0);
        const x1 = x1total.sub(x1borrowing);
        const x2 = x2total.sub(x2borrowing);

        if (x2.eq(0)) {
          acc[marketAddress] = BigNumber.from(0);
          return acc;
        }

        const incomePercentageForPeriod = x2.sub(x1);
        const yearMultiplier = Math.floor(365 / daysConsidered);
        const aprByFees = incomePercentageForPeriod.mul(yearMultiplier).mul(100);
        const aprByBorrowingFee = borrowingFactorPerYear.mul(100);

        acc[marketAddress] = aprByFees.add(aprByBorrowingFee);

        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketsTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketsTokensAPRData,
        avgMarketsAPR,
      };
    },
  });

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId);

  return {
    marketsTokensIncentiveAprData,
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}
