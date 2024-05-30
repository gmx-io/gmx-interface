import { gql } from "@apollo/client";
import { ARBITRUM, ARBITRUM_GOERLI } from "config/chains";
import { getTokenBySymbol } from "config/tokens";
import { sub } from "date-fns";
import { bigMath } from "lib/bigmath";
import { CHART_PERIODS, PRECISION } from "lib/legacy";
import { bigintToNumber, expandDecimals, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfoRequest } from ".";
import useIncentiveStats from "../common/useIncentiveStats";
import { getBorrowingFactorPerPeriod } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { MarketInfo, MarketTokensAPRData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";
import mapValues from "lodash/mapValues";

type RawCollectedFee = {
  cumulativeFeeUsdPerPoolValue: string;
  cumulativeBorrowingFeeUsdPerPoolValue: string;
};

type RawPoolValue = {
  poolValue: string;
};

type GmTokensAPRResult = {
  marketsTokensIncentiveAprData?: MarketTokensAPRData;

  marketsTokensApyData?: MarketTokensAPRData;
  avgMarketsApy?: bigint;
};

type SwrResult = {
  marketsTokensApyData: MarketTokensAPRData;
  avgMarketsApy: bigint;
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
    let arbTokenPrice = 0n;

    if (arbTokenAddress && tokensData) {
      arbTokenPrice = tokensData[arbTokenAddress]?.prices?.minPrice ?? 0n;
    }

    const shouldCalcBonusApr =
      arbTokenPrice > 0 && (chainId === ARBITRUM || chainId === ARBITRUM_GOERLI) && rawIncentivesStats?.lp.isActive;

    return marketAddresses.reduce((acc, marketAddress) => {
      if (!shouldCalcBonusApr || !rawIncentivesStats || !rawIncentivesStats.lp.isActive)
        return { ...acc, [marketAddress]: 0n };

      const arbTokensAmount = BigInt(rawIncentivesStats.lp.rewardsPerMarket[marketAddress] ?? 0);
      const yearMultiplier = BigInt(Math.floor((365 * 24 * 60 * 60) / rawIncentivesStats.lp.period));
      const poolValue = getByKey(marketsInfoData, marketAddress)?.poolValueMin;
      let incentivesApr = 0n;

      if (poolValue !== undefined && poolValue > 0) {
        incentivesApr = bigMath.mulDiv(
          bigMath.mulDiv(arbTokensAmount, arbTokenPrice, poolValue),
          yearMultiplier,
          expandDecimals(1, 14)
        );
      }

      return {
        ...acc,
        [marketAddress]: incentivesApr,
      };
    }, {} as MarketTokensAPRData);
  }, [chainId, marketAddresses, marketsInfoData, rawIncentivesStats, tokensData]);
}

export function useGmMarketsApy(chainId: number): GmTokensAPRResult {
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const marketAddresses = useMarketAddresses(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

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
          marketsTokensApyData: {},
          avgMarketsApy: 0n,
        };
      }

      const response = responseOrNull;

      const marketsTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const lteStartOfPeriodFees = response[`_${marketAddress}_lte_start_of_period_`] as RawCollectedFee[];
        const recentFees = response[`_${marketAddress}_recent`] as RawCollectedFee[];
        const poolValue = BigInt(
          (response[`_${marketAddress}_poolValue`][0] as RawPoolValue | undefined)?.poolValue ?? "0"
        );

        const marketInfo = getByKey(marketsInfoData, marketAddress);
        if (!marketInfo) return acc;

        const x1total = BigInt(lteStartOfPeriodFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x1borrowing = BigInt(lteStartOfPeriodFees[0]?.cumulativeBorrowingFeeUsdPerPoolValue ?? 0);
        const x2total = BigInt(recentFees[0]?.cumulativeFeeUsdPerPoolValue ?? 0);
        const x2borrowing = BigInt(recentFees[0]?.cumulativeBorrowingFeeUsdPerPoolValue ?? 0);
        const x1 = x1total - x1borrowing;
        const x2 = x2total - x2borrowing;

        if (x2 == 0n) {
          acc[marketAddress] = 0n;
          return acc;
        }

        const incomePercentageForPeriod = x2 - x1;
        const yearMultiplier = BigInt(Math.floor(365 / daysConsidered));
        const aprByFees = incomePercentageForPeriod * yearMultiplier;
        const aprByBorrowingFee = calcAprByBorrowingFee(marketInfo, poolValue);

        acc[marketAddress] = aprByFees + aprByBorrowingFee;

        return acc;
      }, {} as MarketTokensAPRData);

      const marketsTokensApyData = mapValues(marketsTokensAPRData, calculateAPY);

      const avgMarketsApy =
        Object.values(marketsTokensApyData).reduce((acc, apr) => {
          return acc + apr;
        }, 0n) / BigInt(marketAddresses.length);

      return {
        avgMarketsApy,
        marketsTokensApyData,
      };
    },
  });

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId);

  return {
    marketsTokensIncentiveAprData,
    avgMarketsApy: data?.avgMarketsApy,
    marketsTokensApyData: data?.marketsTokensApyData,
  };
}

function calcAprByBorrowingFee(marketInfo: MarketInfo, poolValue: bigint) {
  const longOi = marketInfo.longInterestUsd;
  const shortOi = marketInfo.shortInterestUsd;
  const isLongPayingBorrowingFee = longOi > shortOi;
  const borrowingFactorPerYear = getBorrowingFactorPerPeriod(marketInfo, isLongPayingBorrowingFee, CHART_PERIODS["1y"]);

  const borrowingFeeUsdForPoolPerYear =
    (borrowingFactorPerYear * (isLongPayingBorrowingFee ? longOi : shortOi) * 63n) / PRECISION / 100n;

  const borrowingFeeUsdPerPoolValuePerYear = bigMath.mulDiv(borrowingFeeUsdForPoolPerYear, PRECISION, poolValue);

  return borrowingFeeUsdPerPoolValuePerYear;
}

function calculateAPY(apr: bigint) {
  const aprNumber = bigintToNumber(apr, 30);
  const apyNumber = Math.exp(aprNumber) - 1;
  return numberToBigint(apyNumber, 30);
}
