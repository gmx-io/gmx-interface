import { gql } from "@apollo/client";
import { ARBITRUM, ARBITRUM_GOERLI } from "config/chains";
import { getTokenBySymbol } from "config/tokens";
import { sub } from "date-fns";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfoRequest } from ".";
import { useTokensDataRequest } from "../tokens";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";
import { getByKey } from "lib/objects";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import useIncentiveStats from "../common/useIncentiveStats";

type RawCollectedFee = {
  cumulativeFeeUsdPerPoolValue: string;
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
  const rawIncentivesStats = useIncentiveStats(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const marketAddresses = useMarketAddresses(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  return useMemo(() => {
    let arbTokenAddress: null | string = null;
    try {
      arbTokenAddress = getTokenBySymbol(chainId, "ARB").address;
    } catch (err) {
      // ignore
    }
    let arbTokenPrice = BigInt(0);

    if (arbTokenAddress && tokensData) {
      arbTokenPrice = tokensData[arbTokenAddress]?.prices?.minPrice ?? BigInt(0);
    }

    const shouldCalcBonusApr =
      arbTokenPrice.gt(0) && (chainId === ARBITRUM || chainId === ARBITRUM_GOERLI) && rawIncentivesStats?.lp.isActive;

    return marketAddresses.reduce((acc, marketAddress) => {
      if (!shouldCalcBonusApr || !rawIncentivesStats || !rawIncentivesStats.lp.isActive)
        return { ...acc, [marketAddress]: BigInt(0) };

      const arbTokensAmount = BigInt(rawIncentivesStats.lp.rewardsPerMarket[marketAddress] ?? 0);
      const yearMultiplier = Math.floor((365 * 24 * 60 * 60) / rawIncentivesStats.lp.period);
      const poolValue = getByKey(marketsInfoData, marketAddress)?.poolValueMin;
      let incentivesApr = BigInt(0);

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
  }, [chainId, marketAddresses, marketsInfoData, rawIncentivesStats, tokensData]);
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
          avgMarketsAPR: BigInt(0),
        };
      }

      const response = responseOrNull;

      const marketsTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`];
        const recentFees = response[`_${marketAddress}_recent`];

        const x1 = BigInt(lteStartOfPeriodFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x2 = BigInt(recentFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);

        if (x2.eq(0)) {
          acc[marketAddress] = BigInt(0);
          return acc;
        }

        const incomePercentageForPeriod = x2.sub(x1);
        const yearMultiplier = Math.floor(365 / daysConsidered);
        const apr = incomePercentageForPeriod.mul(yearMultiplier).div(expandDecimals(1, 26));

        acc[marketAddress] = apr;

        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketsTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigInt(0))
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
