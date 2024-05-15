import { gql } from "@apollo/client";
import { sub } from "date-fns";
import { BigNumber } from "ethers";
import { CHART_PERIODS, PRECISION } from "lib/legacy";
import { BN_ZERO, expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfoRequest } from ".";
import { useLiquidityProvidersIncentives } from "../common/useIncentiveStats";
import { getBorrowingFactorPerPeriod } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { MarketInfo, MarketTokensAPRData, MarketsInfoData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";

type RawCollectedFee = {
  cumulativeFeeUsdPerPoolValue: string;
  cumulativeBorrowingFeeUsdPerPoolValue: string;
};

type RawPoolValue = {
  poolValue: string;
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

function useMarketAddresses(marketsInfoData: MarketsInfoData | undefined) {
  return useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );
}

function useIncentivesBonusApr(chainId: number, marketsInfoData: MarketsInfoData | undefined): MarketTokensAPRData {
  const liquidityProvidersIncentives = useLiquidityProvidersIncentives(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const marketAddresses = useMarketAddresses(marketsInfoData);
  const token = liquidityProvidersIncentives ? tokensData?.[liquidityProvidersIncentives.token] : undefined;

  return useMemo(() => {
    if (!liquidityProvidersIncentives || !token) return {};

    return marketAddresses.reduce((acc, marketAddress) => {
      const poolValue = getByKey(marketsInfoData, marketAddress)?.poolValueMin;
      if (!poolValue || poolValue.eq(0)) return acc;

      const tokensAmount = liquidityProvidersIncentives.rewardsPerMarket[marketAddress] ?? BN_ZERO;
      const yearMultiplier = Math.floor((365 * 24 * 60 * 60) / liquidityProvidersIncentives.period);
      const apr = tokensAmount
        .mul(token.prices.minPrice)
        .div(expandDecimals(1, token.decimals))
        .mul(PRECISION)
        .div(poolValue)
        .mul(yearMultiplier);

      return {
        ...acc,
        [marketAddress]: apr,
      };
    }, {} as MarketTokensAPRData);
  }, [liquidityProvidersIncentives, marketAddresses, marketsInfoData, token]);
}

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const marketAddresses = useMarketAddresses(marketsInfoData);

  const client = getSubsquidGraphClient(chainId);

  const key =
    marketAddresses.length && marketTokensData && client ? marketAddresses.concat("apr-subsquid").join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();

  const { data } = useSWR<SwrResult>(key, {
    fetcher: async (): Promise<SwrResult> => {
      const marketFeesQuery = (marketAddress: string) => {
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

          _${marketAddress}_poolValue: poolValues(where: { marketAddress_eq: "${marketAddress}" }) {
            poolValue
          }
        `;
      };

      const queryBody = marketAddresses.reduce((acc, marketAddress) => acc + marketFeesQuery(marketAddress), "");
      let responseOrNull: Record<string, [RawCollectedFee | RawPoolValue]> | null = null;
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
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`] as RawCollectedFee[];
        const recentFees = response[`_${marketAddress}_recent`] as RawCollectedFee[];
        const poolValue = BigNumber.from(
          (response[`_${marketAddress}_poolValue`][0] as RawPoolValue | undefined)?.poolValue ?? "0"
        );

        const marketInfo = getByKey(marketsInfoData, marketAddress);
        if (!marketInfo) return acc;

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
        const aprByFees = incomePercentageForPeriod.mul(yearMultiplier);
        const aprByBorrowingFee = calcAprByBorrowingFee(marketInfo, poolValue);

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

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId, marketsInfoData);

  return {
    marketsTokensIncentiveAprData,
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}

function calcAprByBorrowingFee(marketInfo: MarketInfo, poolValue: BigNumber) {
  const longOi = marketInfo.longInterestUsd;
  const shortOi = marketInfo.shortInterestUsd;
  const isLongPayingBorrowingFee = longOi.gt(shortOi);
  const borrowingFactorPerYear = getBorrowingFactorPerPeriod(marketInfo, isLongPayingBorrowingFee, CHART_PERIODS["1y"]);

  const borrowingFeeUsdForPoolPerYear = borrowingFactorPerYear
    .mul(isLongPayingBorrowingFee ? longOi : shortOi)
    .mul(63)
    .div(PRECISION)
    .div(100);

  const borrowingFeeUsdPerPoolValuePerYear = borrowingFeeUsdForPoolPerYear.mul(PRECISION).div(poolValue);

  return borrowingFeeUsdPerPoolValuePerYear;
}
