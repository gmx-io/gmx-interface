import { useCallback, useMemo } from "react";
import useSWR from "swr";

import { getSubgraphUrl } from "config/subgraph";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLidoStakeApr } from "domain/stake/useLidoStakeApr";
import { getPoolUsdWithoutPnl, GlvInfoData } from "domain/synthetics/markets";
import { GM_DECIMALS } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { BN_ZERO, expandDecimals, numberToBigint, PRECISION } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { isGlvEnabled, isGlvInfo } from "./glv";
import { GlvAndGmMarketsInfoData, MarketTokensAPRData } from "./types";
import { useGlvMarketsInfo } from "./useGlvMarkets";
import { useMarketsInfoRequest } from "./useMarketsInfoRequest";
import { useMarketTokensData } from "./useMarketTokensData";
import { useLiquidityProvidersIncentives } from "../common/useIncentiveStats";
import { useTokensDataRequest } from "../tokens";
import { convertToUsd } from "../tokens/utils";

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
  marketsTokensLidoAprData: MarketTokensAPRData;
  glvApyInfoData: MarketTokensAPRData;
  avgMarketsApy: bigint;
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

  const lidoApr = useLidoStakeApr();

  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data } = useSWR(key, {
    fetcher: async (): Promise<SwrResult> => {
      const apys = await oracleKeeperFetcher.fetchApys();
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

      const marketsTokensApyData = Object.entries(apys.markets).reduce((acc, [address, { baseApy }]) => {
        acc[address] = numberToBigint(baseApy, 30);
        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsApy =
        Object.values(marketsTokensApyData).reduce((acc, apr) => {
          return acc + apr;
        }, 0n) / BigInt(marketAddresses.length);

      const glvApyInfoData = Object.entries(apys.glvs).reduce((acc, [address, { baseApy }]) => {
        acc[address] = numberToBigint(baseApy, 30);
        return acc;
      }, {} as MarketTokensAPRData);

      return {
        marketsTokensLidoAprData,
        avgMarketsApy,
        marketsTokensApyData,
        glvApyInfoData,
      };
    },
  });

  const marketsTokensIncentiveAprData = useIncentivesBonusApr(chainId, marketsInfoData, glvData);

  return {
    glvApyInfoData: data?.glvApyInfoData,
    marketsTokensLidoAprData: data?.marketsTokensLidoAprData,
    marketsTokensIncentiveAprData: marketsTokensIncentiveAprData.marketTokensAPRData,
    glvTokensIncentiveAprData: marketsTokensIncentiveAprData.glvTokensAPRData,
    avgMarketsApy: data?.avgMarketsApy,
    marketsTokensApyData: data?.marketsTokensApyData,
  };
}
