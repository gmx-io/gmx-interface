import { MarketInfo, getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BN_ZERO } from "lib/numbers";
import groupBy from "lodash/groupBy";
import maxBy from "lodash/maxBy";
import { selectTradeboxAvailableTokensOptions } from ".";
import { createSelector } from "context/SyntheticsStateContext/utils";

export type TokenOption = {
  maxLongLiquidity: bigint;
  maxShortLiquidity: bigint;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

function bnClampMin(value: bigint, min: bigint) {
  return value < min ? min : value;
}

const selectSortedAllMarkets = createSelector((q) => q(selectTradeboxAvailableTokensOptions).sortedAllMarkets);

export const selectTradeboxGetMaxLongShortLiquidityPool = createSelector((q) => {
  const sortedAllMarkets = q(selectSortedAllMarkets);

  return createGetMaxLongShortLiquidityPool(sortedAllMarkets);
});

export function createGetMaxLongShortLiquidityPool(sortedAllMarkets: MarketInfo[]) {
  const marketsWithMaxReservedUsd = sortedAllMarkets.map((marketInfo) => {
    const maxLongLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
    const maxShortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

    return {
      maxLongLiquidity: bnClampMin(maxLongLiquidity, BN_ZERO),
      maxShortLiquidity: bnClampMin(maxShortLiquidity, BN_ZERO),
      marketTokenAddress: marketInfo.marketTokenAddress,
      indexTokenAddress: marketInfo.indexTokenAddress,
    };
  });

  const groupedIndexMarkets: { [marketAddress: string]: TokenOption[] } = groupBy(
    marketsWithMaxReservedUsd as any,
    (market) => market.indexTokenAddress
  );

  return (token: Token) => {
    const indexTokenAddress = token.isNative ? token.wrappedAddress : token.address;
    const currentMarkets = groupedIndexMarkets[indexTokenAddress!];
    const maxLongLiquidityPool = maxBy(currentMarkets, (market) => market.maxLongLiquidity)!;
    const maxShortLiquidityPool = maxBy(currentMarkets, (market) => market.maxShortLiquidity)!;

    return {
      maxLongLiquidityPool,
      maxShortLiquidityPool,
    };
  };
}
