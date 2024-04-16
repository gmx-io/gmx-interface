import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { BN_ZERO } from "lib/numbers";
import groupBy from "lodash/groupBy";
import maxBy from "lodash/maxBy";
import { selectTradeboxAvailableTokensOptions } from ".";
import { createSelector } from "context/SyntheticsStateContext/utils";

export type TokenOption = {
  maxLongLiquidity: BigNumber;
  maxShortLiquidity: BigNumber;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

export function bnClampMin(value: BigNumber, min: BigNumber) {
  return value.lt(min) ? min : value;
}

const selectSortedAllMarkets = createSelector((q) => q(selectTradeboxAvailableTokensOptions).sortedAllMarkets);

export const selectTradeboxGetMaxLongShortLiquidityPool = createSelector((q) => {
  const sortedAllMarkets = q(selectSortedAllMarkets);

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
    const maxLongLiquidityPool = maxBy(currentMarkets, (market) => market.maxLongLiquidity.toBigInt())!;
    const maxShortLiquidityPool = maxBy(currentMarkets, (market) => market.maxShortLiquidity.toBigInt())!;

    return {
      maxLongLiquidityPool,
      maxShortLiquidityPool,
    };
  };
});
