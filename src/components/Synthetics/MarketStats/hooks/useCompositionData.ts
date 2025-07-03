import { useMemo } from "react";

import { BASIS_POINTS_DECIMALS } from "config/factors";
import {
  GlvAndGmMarketsInfoData,
  GlvInfo,
  GlvOrMarketInfo,
  getPoolUsdWithoutPnl,
  getStrictestMaxPoolUsdForDeposit,
  isMarketInfo,
} from "domain/synthetics/markets";
import { getMaxUsdCapUsdInGmGlvMarket, isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { defined } from "lib/guards";
import { bigintToNumber, getBasisPoints } from "lib/numbers";
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
  side: "long" | "short";
};

export type CompositionItem = MarketCompositionItem | BackingCompositionItem;
export type CompositionType = CompositionItem["type"];

export function useCompositionData({
  glvOrMarketInfo,
  glvAndMarketsInfoData,
  marketTokensData,
}: {
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} {
  return useMemo(() => {
    if (!glvOrMarketInfo || !glvAndMarketsInfoData || !marketTokensData) {
      return {
        backing: [],
        market: [],
      };
    }

    if (isGlvInfo(glvOrMarketInfo)) {
      return getGlvInfoCompositionData({
        glvInfo: glvOrMarketInfo,
        glvAndMarketsInfoData: glvAndMarketsInfoData,
        marketTokensData,
      });
    }

    return getMarketInfoCompositionData({ marketInfo: glvOrMarketInfo, marketTokensData });
  }, [glvOrMarketInfo, marketTokensData, glvAndMarketsInfoData]);
}

const getGlvInfoCompositionData = ({
  glvInfo,
  glvAndMarketsInfoData,
  marketTokensData,
}: {
  glvInfo: GlvInfo;
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData;
  marketTokensData: TokensData;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} => {
  const market = glvInfo.markets
    .map((market): MarketCompositionItem | null => {
      const marketInfo = glvAndMarketsInfoData[market.address];

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

  const compositionData = glvInfo.markets
    .flatMap((market) => {
      const marketInfo = glvAndMarketsInfoData[market.address];
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
            side: curr.side,
          };
        }

        acc[curr.token.address].amount = curr.amount + (acc[curr.token.address].amount ?? 0n);
        return acc;
      },
      {} as Record<string, BackingCompositionItem>
    );

  const backing = Object.values(compositionData).map((d) => {
    return {
      amount: d.amount,
      type: d.type,
      token: d.token,
      side: d.side,
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
  marketTokensData: TokensData;
}): {
  backing: BackingCompositionItem[];
  market: MarketCompositionItem[];
} => {
  const token = getTokenData(marketTokensData, marketInfo.marketTokenAddress);
  const balanceUsd = convertToUsd(token?.totalSupply, token?.decimals, token?.prices.maxPrice) ?? 0n;
  const maxPoolUsd =
    getStrictestMaxPoolUsdForDeposit(marketInfo, true) + getStrictestMaxPoolUsdForDeposit(marketInfo, false);

  const market = token
    ? {
        type: "market" as const,
        market: marketInfo,
        tvl: [balanceUsd, maxPoolUsd] as const,
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
      side: "long",
    },
    {
      type: "backing",
      token: shortToken,
      amount: shortPoolAmountUsd ?? 0n,
      side: "short",
    },
  ];
};

export const getCompositionPercentage = <T extends bigint | number>(value: T, sum: T) => {
  if (sum === 0 || sum === 0n) {
    return 0;
  }

  let bps: number;
  if (typeof value === "bigint") {
    bps = bigintToNumber(getBasisPoints(value as bigint, sum as bigint), BASIS_POINTS_DECIMALS);
  } else {
    bps = value / sum;
  }
  return Number((bps * 100).toFixed(2));
};
