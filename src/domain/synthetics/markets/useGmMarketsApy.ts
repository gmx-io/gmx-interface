import { gql } from "@apollo/client";
import { sub } from "date-fns";
import { bigMath } from "lib/bigmath";
import { CHART_PERIODS, GM_DECIMALS, PRECISION } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { BN_ZERO, bigintToNumber, expandDecimals, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import mapValues from "lodash/mapValues";
import { useMemo } from "react";
import useSWR from "swr";
import { useLiquidityProvidersIncentives } from "../common/useIncentiveStats";
import { getBorrowingFactorPerPeriod } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { MarketInfo, MarketTokensAPRData, MarketsInfoData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";
import { useMarketsInfoRequest } from "./useMarketsInfoRequest";

import TokenAbi from "abis/Token.json";

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

function useMarketAddresses(marketsInfoData: MarketsInfoData | undefined) {
  return useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );
}

function useExcludedLiquidityMarketMap(
  chainId: number,
  marketsInfoData: MarketsInfoData | undefined
): {
  [marketAddress: string]: bigint;
} {
  const liquidityProvidersIncentives = useLiquidityProvidersIncentives(chainId);
  const excludeHolders = liquidityProvidersIncentives?.excludeHolders ?? [];
  const marketAddresses = useMarketAddresses(marketsInfoData);

  const request: MulticallRequestConfig<{
    [marketAddress: string]: {
      calls: {
        [holder: string]: {
          methodName: string;
          params: any[];
        };
      };
    };
  }> = {};

  for (const marketAddress of marketAddresses) {
    request[marketAddress] = {
      abi: TokenAbi.abi,
      contractAddress: marketAddress,
      calls: Object.fromEntries(
        excludeHolders.map(
          (holder) =>
            [
              holder,
              {
                methodName: "balanceOf",
                params: [holder],
              },
            ] as const
        )
      ),
    };
  }

  const excludedBalancesMulticall = useMulticall(chainId, "useExcludedLiquidity", {
    key: excludeHolders ? [excludeHolders.join(","), marketAddresses.join(",")] : null,
    request,
    parseResponse: (res) => {
      const result: { [marketAddress: string]: bigint } = {};

      for (const marketAddress of marketAddresses) {
        const marketData = res.data[marketAddress];
        let totalExcludedBalance = 0n;

        for (const excludedHolder of excludeHolders) {
          const excludedBalance = BigInt(marketData[excludedHolder]?.returnValues[0] ?? 0);
          totalExcludedBalance += excludedBalance;
        }

        result[marketAddress] = totalExcludedBalance;
      }

      return result;
    },
  });

  return excludedBalancesMulticall.data ?? {};
}

function useIncentivesBonusApr(chainId: number, marketsInfoData: MarketsInfoData | undefined): MarketTokensAPRData {
  const liquidityProvidersIncentives = useLiquidityProvidersIncentives(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const marketAddresses = useMarketAddresses(marketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const tokenAddress = liquidityProvidersIncentives?.token;
  const excludedLiquidityMarketMap = useExcludedLiquidityMarketMap(chainId, marketsInfoData);

  const regularToken = useMemo(() => {
    if (!tokenAddress || !tokensData) return undefined;

    const lowerCased = tokenAddress.toLowerCase();
    const key = Object.keys(tokensData).find((key) => key.toLowerCase() === lowerCased);
    return key ? tokensData[key] : undefined;
  }, [tokenAddress, tokensData]);

  const marketToken = useMemo(() => {
    if (!tokenAddress || !marketTokensData) return undefined;

    const lowerCased = tokenAddress.toLowerCase();
    const key = Object.keys(marketTokensData).find((key) => key.toLowerCase() === lowerCased);
    return key ? marketTokensData[key] : undefined;
  }, [marketTokensData, tokenAddress]);

  const token = useMemo(() => {
    if (regularToken) {
      return {
        price: regularToken.prices.minPrice,
        decimals: regularToken.decimals,
        symbol: regularToken.symbol,
      };
    }

    if (marketToken) {
      return {
        price: marketToken.prices.minPrice,
        decimals: GM_DECIMALS,
        symbol: marketToken.name,
      };
    }

    return undefined;
  }, [marketToken, regularToken]);

  const marketTokensAPRData = useMemo<MarketTokensAPRData>(() => {
    if (!liquidityProvidersIncentives || !token) return {};

    const marketTokensAPRData: MarketTokensAPRData = {};
    for (const marketAddress of marketAddresses) {
      const poolValue = getByKey(marketsInfoData, marketAddress)?.poolValueMin;
      if (poolValue === undefined || poolValue === 0n) continue;
      const excludedLiquidity = excludedLiquidityMarketMap[marketAddress] ?? 0n;
      const poolValueWithoutExcludedLPs = poolValue - excludedLiquidity;

      const tokensAmount = liquidityProvidersIncentives.rewardsPerMarket[marketAddress] ?? BN_ZERO;
      const yearMultiplier = BigInt(Math.floor((365 * 24 * 60 * 60) / liquidityProvidersIncentives.period));
      const apr =
        bigMath.mulDiv(
          bigMath.mulDiv(tokensAmount, token.price, expandDecimals(1, token.decimals)),
          PRECISION,
          poolValueWithoutExcludedLPs
        ) * yearMultiplier;

      marketTokensAPRData[marketAddress] = apr;
    }

    return marketTokensAPRData;
  }, [excludedLiquidityMarketMap, liquidityProvidersIncentives, marketAddresses, marketsInfoData, token]);

  return marketTokensAPRData;
}

export function useGmMarketsApy(chainId: number): GmTokensAPRResult {
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

      const marketsTokensApyData = mapValues(marketsTokensAPRData, (x) => calculateAPY(x));

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

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId, marketsInfoData);

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
