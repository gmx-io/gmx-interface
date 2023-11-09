import { gql } from "@apollo/client";
import { ARBITRUM, ARBITRUM_GOERLI } from "config/chains";
import { getTokenBySymbol } from "config/tokens";
import { sub } from "date-fns";
import { BigNumber } from "ethers";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfo } from ".";
import { RawIncentivesStats, useOracleKeeperFetcher, useTokensData } from "../tokens";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";
import { getByKey } from "lib/objects";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";

type RawCollectedFees = {
  cumulativeFeeUsdPerPoolValue: string;
};

type MarketTokensAPRResult = {
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensAPRData?: MarketTokensAPRData;
  avgMarketsAPR?: BigNumber;
};

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const client = getSyntheticsGraphClient(chainId);
  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const { tokensData } = useTokensData(chainId);

  const key = marketAddresses.length && marketTokensData && client ? marketAddresses.join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();

  const { data } = useSWR(key, {
    fetcher: async () => {
      let arbTokenAddress: null | string = null;
      try {
        arbTokenAddress = getTokenBySymbol(chainId, "ARB").address;
      } catch (err) {}
      let arbTokenPrice = BigNumber.from(0);

      if (arbTokenAddress && tokensData) {
        arbTokenPrice = tokensData[arbTokenAddress]?.prices?.minPrice ?? BigNumber.from(0);
      }

      let shouldCalcBonusApr = arbTokenPrice.gt(0) && (chainId === ARBITRUM || chainId === ARBITRUM_GOERLI);
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
      let fetchingResult: null | [any, RawIncentivesStats["lp"] | null] = null;
      try {
        fetchingResult = await Promise.all([
          client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" }),
          shouldCalcBonusApr
            ? oracleKeeperFetcher.fetchIncentivesRewards().then((res) => res?.lp ?? null)
            : Promise.resolve(null),
        ]);
      } catch (err) {
        return {
          marketsTokensAPRData: {},
          avgMarketsAPR: BigNumber.from(0),
          marketsTokensIncentiveAprData: {},
        };
      }
      const response = fetchingResult![0].data;
      const rawIncentivesStats = fetchingResult![1];

      shouldCalcBonusApr = Boolean(shouldCalcBonusApr && rawIncentivesStats && rawIncentivesStats!.isActive);

      const marketsTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`] as RawCollectedFees[];
        const recentFees = response[`_${marketAddress}_recent`] as RawCollectedFees[];

        const poolValue1 = bigNumberify(lteStartOfPeriodFees[0]!.cumulativeFeeUsdPerPoolValue) ?? BigNumber.from(0);
        const poolValue2 = bigNumberify(recentFees[0]!.cumulativeFeeUsdPerPoolValue);

        if (!poolValue2) {
          acc[marketAddress] = BigNumber.from(0);
          return acc;
        }

        const incomePercentageForPeriod = poolValue2.sub(poolValue1);
        const yearMultiplier = Math.floor(365 / daysConsidered);
        const apr = incomePercentageForPeriod.mul(yearMultiplier).div(expandDecimals(1, 26));

        acc[marketAddress] = apr;

        return acc;
      }, {} as MarketTokensAPRData);

      const marketsTokensIncentiveAprData: MarketTokensAPRData =
        !shouldCalcBonusApr || !rawIncentivesStats
          ? {}
          : marketAddresses.reduce((acc, marketAddress) => {
              const arbTokensAmount = BigNumber.from(rawIncentivesStats.rewardsPerMarket[marketAddress] ?? 0);
              const yearMultiplier = Math.floor((365 * 24 * 60 * 60) / rawIncentivesStats.period);
              const poolValue = getByKey(marketsInfoData, marketAddress)?.poolValueMin;
              let incentivesApr = BigNumber.from(0);

              if (poolValue?.gt(0)) {
                incentivesApr = arbTokensAmount
                  .mul(arbTokenPrice)
                  .div(poolValue)
                  .mul(yearMultiplier)
                  .div(expandDecimals(1, 14));
              }

              return {
                ...acc,
                [marketAddress]: incentivesApr,
              };
            }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketsTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketsTokensAPRData,
        avgMarketsAPR,
        marketsTokensIncentiveAprData,
      };
    },
  });

  return {
    marketsTokensIncentiveAprData: data?.marketsTokensIncentiveAprData,
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}
