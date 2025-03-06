import { sub } from "date-fns";
import { useLidoStakeApr } from "domain/stake/useLidoStakeApr";
import { GlvInfoData, getPoolUsdWithoutPnl, isMarketInfo } from "domain/synthetics/markets";
import { CHART_PERIODS, GM_DECIMALS } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { BN_ZERO, PRECISION, bigintToNumber, expandDecimals, numberToBigint } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import mapValues from "lodash/mapValues";
import { useCallback, useMemo } from "react";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import useSWR from "swr";
import { useLiquidityProvidersIncentives } from "../common/useIncentiveStats";
import { getBorrowingFactorPerPeriod } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { GlvAndGmMarketsInfoData, MarketInfo, MarketTokensAPRData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";

import { getMarketListingDate } from "config/markets";
import { getSubgraphUrl } from "config/subgraph";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { convertToUsd } from "../tokens/utils";
import { getIsBaseApyReadyToBeShown } from "./getIsBaseApyReadyToBeShown";
import { isGlvEnabled, isGlvInfo } from "./glv";
import { useGlvMarketsInfo } from "./useGlvMarkets";
import { useMarketsInfoRequest } from "./useMarketsInfoRequest";

type RawCollectedFee = {
  cumulativeFeeUsdPerPoolValue: string;
  cumulativeBorrowingFeeUsdPerPoolValue: string;
};

type RawPoolValue = {
  poolValue: string;
};

type GmGlvTokensAPRResult = {
  glvApyInfoData: MarketTokensAPRData;
  glvTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensLidoAprData?: MarketTokensAPRData;
  marketsTokensApyData?: MarketTokensAPRData;
  avgMarketsApy?: bigint;
};

type SwrResult = {
  marketsTokensApyData: MarketTokensAPRData;
  avgMarketsApy: bigint;
  marketsTokensLidoAprData: MarketTokensAPRData;
};

function useMarketAddresses(marketsInfoData: GlvAndGmMarketsInfoData | undefined) {
  return useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );
}

function useExcludedLiquidityMarketMap(
  chainId: number,
  marketsInfoData: GlvAndGmMarketsInfoData | undefined
): {
  [marketAddress: string]: bigint;
} {
  const liquidityProvidersIncentives = useLiquidityProvidersIncentives(chainId);
  const excludeHolders = liquidityProvidersIncentives?.excludeHolders ?? EMPTY_ARRAY;
  const marketAddresses = useMarketAddresses(marketsInfoData);

  const request = useCallback<
    () => MulticallRequestConfig<{
      [marketAddress: string]: {
        calls: {
          [holder: string]: {
            methodName: string;
            params: any[];
          };
        };
      };
    }>
  >(() => {
    const req: MulticallRequestConfig<{
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
      req[marketAddress] = {
        abiId: "Token",
        contractAddress: marketAddress,
        calls: {},
      };

      for (const holder of excludeHolders) {
        req[marketAddress].calls[holder] = {
          methodName: "balanceOf",
          params: [holder],
        };
      }
    }

    return req;
  }, [excludeHolders, marketAddresses]);

  const excludedBalancesMulticall = useMulticall(chainId, "useExcludedLiquidityMarketMap", {
    key:
      excludeHolders.length > 0 && marketAddresses.length > 0
        ? [excludeHolders.join(","), marketAddresses.join(",")]
        : null,
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

function useIncentivesBonusApr(
  chainId: number,
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  glvData: GlvInfoData | undefined
) {
  const liquidityProvidersIncentives = useLiquidityProvidersIncentives(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const marketAddresses = useMarketAddresses(marketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false, withGlv: true, glvData });
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

  const marketAndGlvTokensAPRData = useMemo(() => {
    if (!liquidityProvidersIncentives || !token) {
      return {
        marketTokensAPRData: {},
        glvTokensAPRData: {},
      };
    }

    const marketTokensAPRData: MarketTokensAPRData = {};
    const glvTokensAPRData: MarketTokensAPRData = {};

    for (const marketAddress of marketAddresses) {
      const market = getByKey(marketsInfoData, marketAddress);
      if (!market) {
        continue;
      }

      const marketToken = marketTokensData?.[marketAddress];
      const poolValue = market?.poolValueMin;

      if (poolValue === undefined || poolValue === 0n || !marketToken) continue;
      const excludedLiquidity =
        convertToUsd(
          excludedLiquidityMarketMap[marketAddress] ?? 0n,
          marketToken?.decimals,
          marketToken?.prices.maxPrice
        ) ?? 0n;
      const poolValueWithoutExcludedLPs = poolValue - excludedLiquidity;

      const tokensAmount = liquidityProvidersIncentives.rewardsPerMarket[marketAddress] ?? BN_ZERO;
      const yearMultiplier = BigInt(Math.floor((365 * 24 * 60 * 60) / liquidityProvidersIncentives.period));
      const apr =
        bigMath.mulDiv(
          bigMath.mulDiv(tokensAmount, token.price, expandDecimals(1, token.decimals)),
          PRECISION,
          poolValueWithoutExcludedLPs
        ) * yearMultiplier;

      if (isGlvInfo(market)) {
        glvTokensAPRData[marketAddress] = apr;
      } else {
        marketTokensAPRData[marketAddress] = apr;
      }
    }

    return {
      marketTokensAPRData,
      glvTokensAPRData,
    };
  }, [
    excludedLiquidityMarketMap,
    liquidityProvidersIncentives,
    marketAddresses,
    marketsInfoData,
    token,
    marketTokensData,
  ]);

  return marketAndGlvTokensAPRData;
}

function getMarketFeesQuery(marketAddress: string) {
  return `
      _${marketAddress}_lte_start_of_period_: collectedMarketFeesInfos(
          orderBy:timestampGroup_DESC
          where: {
            marketAddress_eq: "${marketAddress}"
            period_eq: "1h"
            timestampGroup_lte: $timestampGroup_lte
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
}

export function useGmMarketsApy(chainId: number): GmGlvTokensAPRResult {
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false, withGlv: false });
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData: onlyGmMarketsInfoData } = useMarketsInfoRequest(chainId);
  const enabledGlv = isGlvEnabled(chainId);
  const account = useSelector(selectAccount);

  const { glvData } = useGlvMarketsInfo(enabledGlv, {
    marketsInfoData: onlyGmMarketsInfoData,
    tokensData,
    chainId,
    account,
  });

  const marketsInfoData = {
    ...onlyGmMarketsInfoData,
    ...glvData,
  };

  const marketAddresses = useMarketAddresses(marketsInfoData);

  const subsquidUrl = getSubgraphUrl(chainId, "subsquid");

  const key =
    marketAddresses.length && marketTokensData && subsquidUrl ? marketAddresses.concat("apr-subsquid").join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();
  const lidoApr = useLidoStakeApr();

  const { data } = useSWR<SwrResult>(key, {
    fetcher: async (): Promise<SwrResult> => {
      let queryBody = marketAddresses.reduce((acc, marketAddress) => acc + getMarketFeesQuery(marketAddress), "");

      queryBody = `query ($timestampGroup_lte: Int) {${queryBody}}`;

      let responseOrNull: Record<string, [RawCollectedFee | RawPoolValue]> | undefined = undefined;
      try {
        responseOrNull = await graphqlFetcher<Record<string, [RawCollectedFee | RawPoolValue]>>(
          subsquidUrl!,
          queryBody,
          {
            timestampGroup_lte: Math.floor(sub(new Date(), { days: daysConsidered }).valueOf() / 1000),
          }
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      if (!responseOrNull) {
        return {
          marketsTokensLidoAprData: {},
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
        if (!marketInfo || !isMarketInfo(marketInfo)) return acc;

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

      const wstEthToken = getTokenBySymbolSafe(chainId, "wstETH");

      const marketsTokensLidoAprData = marketAddresses.reduce((acc, marketAddress) => {
        const marketInfo = getByKey(marketsInfoData, marketAddress);
        if (!marketInfo || !wstEthToken || lidoApr === undefined || isGlvInfo(marketInfo)) return acc;

        const longTokenData = {
          address: marketInfo.longTokenAddress,
          amount: getPoolUsdWithoutPnl(marketInfo, true, "midPrice"),
        };

        const shortTokenData = {
          address: marketInfo.shortTokenAddress,
          amount: getPoolUsdWithoutPnl(marketInfo, false, "midPrice"),
        };

        const { incentivesedTokenAmountUsd, otherTokenAmountUsd } = [longTokenData, shortTokenData].reduce(
          (amountAcc, { address, amount }) => {
            if (address === wstEthToken.address) {
              amountAcc.incentivesedTokenAmountUsd += amount;
            } else {
              amountAcc.otherTokenAmountUsd += amount;
            }
            return amountAcc;
          },
          { incentivesedTokenAmountUsd: 0n, otherTokenAmountUsd: 0n }
        );

        const totalPoolAmountUsd = incentivesedTokenAmountUsd + otherTokenAmountUsd;

        if (incentivesedTokenAmountUsd === 0n || totalPoolAmountUsd === 0n) {
          acc[marketAddress] = 0n;
        } else {
          acc[marketAddress] = bigMath.mulDiv(lidoApr, incentivesedTokenAmountUsd, totalPoolAmountUsd);
        }

        return acc;
      }, {} as MarketTokensAPRData);

      const marketsTokensApyData = mapValues(marketsTokensAPRData, (x) => calculateAPY(x));

      const avgMarketsApy =
        Object.values(marketsTokensApyData).reduce((acc, apr) => {
          return acc + apr;
        }, 0n) / BigInt(marketAddresses.length);

      return {
        marketsTokensLidoAprData,
        avgMarketsApy,
        marketsTokensApyData,
      };
    },
  });

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId, marketsInfoData, glvData);

  const glvApyInfoData = useMemo(() => {
    if (!glvData || !data?.marketsTokensApyData) {
      return {};
    }

    return Object.values(glvData).reduce((acc, { markets, glvTokenAddress }) => {
      const marketData = markets.map((market) => {
        const isBaseApyEligible = getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, market.address));
        const apy = isBaseApyEligible ? data.marketsTokensApyData[market.address] : 0n;
        const marketBalance = market.gmBalance;
        const price = marketTokensData?.[market.address].prices.minPrice ?? 0n;
        const decimals = marketTokensData?.[market.address].decimals ?? 0;
        const amountUsd = apy !== 0n ? convertToUsd(marketBalance, decimals, price) ?? 0n : 0n;

        return {
          apy,
          amountUsd,
        };
      });

      const total = marketData.reduce((acc, { amountUsd }) => acc + amountUsd, 0n);
      const hasEmptyApy = marketData.some(({ apy }) => apy === undefined);
      const sumApys = hasEmptyApy
        ? undefined
        : marketData.reduce((acc: bigint, { amountUsd, apy }) => acc + amountUsd * apy, 0n);

      if (sumApys === undefined) {
        acc[glvTokenAddress] = undefined;
      } else {
        acc[glvTokenAddress] = total === 0n ? 0n : sumApys / total;
      }

      return acc;
    }, {});
  }, [glvData, data?.marketsTokensApyData, marketTokensData, chainId]);

  return {
    glvApyInfoData,
    marketsTokensLidoAprData: data?.marketsTokensLidoAprData,
    marketsTokensIncentiveAprData: marketsTokensIncentiveAprData.marketTokensAPRData,
    glvTokensIncentiveAprData: marketsTokensIncentiveAprData.glvTokensAPRData,
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
  if (apyNumber === Infinity) {
    return 0n;
  }
  return numberToBigint(apyNumber, 30);
}
