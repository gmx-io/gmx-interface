import groupBy from "lodash/groupBy";
import maxBy from "lodash/maxBy";

import { selectJitLiquidityMap } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { JitLiquidityInfo, getJitLiquidityInfo } from "domain/synthetics/jit/utils";
import { MarketInfo, getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BN_ZERO } from "lib/numbers";

const selectTradeboxAvailableTokensOptions = (s: SyntheticsState) => s.tradebox.availableTokensOptions;

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
  const jitLiquidityMap = q(selectJitLiquidityMap);

  return createGetMaxLongShortLiquidityPool(sortedAllMarkets, jitLiquidityMap);
});

export function createGetMaxLongShortLiquidityPool(
  sortedAllMarkets: MarketInfo[],
  jitLiquidityMap?: Record<string, JitLiquidityInfo>
) {
  const marketsWithMaxReservedUsd = sortedAllMarkets.map((marketInfo) => {
    const jitInfo = getJitLiquidityInfo(jitLiquidityMap, marketInfo.marketTokenAddress);
    const maxLongLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true, jitInfo?.maxReservedUsdWithJitLong);
    const maxShortLiquidity = getAvailableUsdLiquidityForPosition(
      marketInfo,
      false,
      jitInfo?.maxReservedUsdWithJitShort
    );

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
