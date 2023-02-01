import {
  MarketsData,
  MarketsOpenInterestData,
  MarketsPoolsData,
  getAvailableUsdLiquidityForPosition,
  getMarket,
} from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { TokensData } from "../tokens";

export function getMostLiquidMarketForPosition(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  indexTokenAddress: string,
  collateralTokenAddress: string | undefined,
  isLong: boolean | undefined
) {
  if (!indexTokenAddress || typeof isLong === "undefined") return undefined;

  const markets = Object.values(marketsData);

  let bestMarketAddress: string = markets[0]?.marketTokenAddress;
  let bestLiquidity: BigNumber | undefined;

  for (const m of markets) {
    if (
      (!collateralTokenAddress || [m.longTokenAddress, m.shortTokenAddress].includes(collateralTokenAddress)) &&
      m.indexTokenAddress === indexTokenAddress
    ) {
      const liquidity = getAvailableUsdLiquidityForPosition(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        m.marketTokenAddress,
        isLong
      );

      if (!bestLiquidity || liquidity?.gt(bestLiquidity)) {
        bestMarketAddress = m.marketTokenAddress;
        bestLiquidity = liquidity;
      }
    }
  }

  return getMarket(marketsData, bestMarketAddress);
}
