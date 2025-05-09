import { useMemo } from "react";

import {
  GlvAndGmMarketsInfoData,
  GlvInfo,
  GlvOrMarketInfo,
  getPoolUsdWithoutPnl,
  isMarketInfo,
} from "domain/synthetics/markets";
import { getMaxUsdCapUsdInGmGlvMarket, isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { defined } from "lib/guards";
import { MarketInfo } from "sdk/types/markets";

type MarketCompositionItem = {
  type: "market";
  market: MarketInfo;
  tvl: readonly [used: bigint, available: bigint];
  gmBalanceUsd: bigint;
};

type BackingCompositionItem = {
  type: "backing";
  token: TokenData;
  amount: bigint;
};

export type CompositionItem = MarketCompositionItem | BackingCompositionItem;
export type CompositionType = CompositionItem["type"];

export function useCompositionData({
  marketInfo,
  marketsInfoData,
  marketTokensData,
}: {
  marketInfo: GlvOrMarketInfo | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} {
  return useMemo(() => {
    if (!marketInfo) {
      return {
        backing: [],
        market: [],
      };
    }

    if (isGlvInfo(marketInfo)) {
      return getGlvInfoCompositionData({ marketInfo, marketsInfoData, marketTokensData });
    }

    return getMarketInfoCompositionData({ marketInfo, marketTokensData });
  }, [marketInfo, marketTokensData, marketsInfoData]);
}

const getGlvInfoCompositionData = ({
  marketInfo,
  marketsInfoData,
  marketTokensData,
}: {
  marketInfo: GlvInfo;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} => {
  const market = marketInfo.markets
    .map((market): MarketCompositionItem | null => {
      const marketInfo = marketsInfoData?.[market.address];

      if (marketInfo && isMarketInfo(marketInfo)) {
        const token = getTokenData(marketTokensData, marketInfo.marketTokenAddress);
        if (!token) {
          return null;
        }

        const balanceUsd = convertToUsd(market.gmBalance, token.decimals, token.prices.maxPrice) ?? 0n;

        return {
          type: "market",
          market: marketInfo,
          tvl: [balanceUsd, getMaxUsdCapUsdInGmGlvMarket(market, token)] as const,
          gmBalanceUsd: balanceUsd,
        };
      }

      return null;
    })
    .filter(defined)
    .sort((a, b) => (b.gmBalanceUsd > a.gmBalanceUsd ? 1 : -1));

  const compositionData = marketInfo.markets
    .flatMap((market) => {
      const marketInfo = marketsInfoData?.[market.address];
      if (marketInfo && isMarketInfo(marketInfo)) {
        return getMarketBackingCompositionData(marketInfo);
      }

      return [];
    })
    .reduce(
      (acc, curr) => {
        if (!acc[curr.token.address]) {
          acc[curr.token.address] = {
            type: curr.type,
            amount: 0n,
            token: curr.token,
          };
        }

        acc[curr.token.address].amount = curr.amount + (acc[curr.token.address].amount ?? 0n);
        return acc;
      },
      {} as Record<string, BackingCompositionItem>
    );

  const backing = Object.entries(compositionData).map(([_, d]) => {
    return {
      amount: d.amount,
      type: d.type,
      token: d.token,
    };
  });

  return {
    backing,
    market,
  };
};

const getMarketInfoCompositionData = ({
  marketInfo,
  marketTokensData,
}: {
  marketInfo: MarketInfo;
  marketTokensData: TokensData | undefined;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} => {
  const token = getTokenData(marketTokensData, marketInfo.marketTokenAddress);
  const balanceUsd = convertToUsd(token?.totalSupply, token?.decimals, token?.prices.maxPrice) ?? 0n;

  const market = token
    ? {
        type: "market" as const,
        market: marketInfo,
        tvl: [token.totalSupply ?? 0n, token?.balance ?? 0n] as const,
        gmBalanceUsd: balanceUsd,
      }
    : null;

  const backing = getMarketBackingCompositionData(marketInfo);

  return {
    backing,
    market: market ? [market] : [],
  };
};

const getMarketBackingCompositionData = (marketInfo: MarketInfo): BackingCompositionItem[] => {
  const { longToken, shortToken } = marketInfo;
  const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

  return [
    {
      type: "backing",
      token: longToken,
      amount: longPoolAmountUsd ?? 0n,
    },
    {
      type: "backing",
      token: shortToken,
      amount: shortPoolAmountUsd ?? 0n,
    },
  ];
};

export const getCompositionPercentage = (value: bigint | number, sum: bigint | number) => {
  return Math.round((Number(value) / Number(sum)) * 10000) / 100;
};
