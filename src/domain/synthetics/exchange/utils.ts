import { BigNumber } from "ethers";
import { intersection } from "lodash";
import { getMarkets, getTokenPoolAmount, Market, MarketsData, MarketsPoolsData } from "../markets";

export function filterMarketsByLiquidity(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  markets: Market[],
  toToken: string,
  toAmount: BigNumber
) {
  if (!toToken) return [];

  return markets.filter((market) => {
    return getTokenPoolAmount(marketsData, poolsData, market.marketTokenAddress, toToken)?.gt(toAmount);
  });
}

export function getMarketsByTokens(marketsData: MarketsData) {
  const markets = getMarkets(marketsData);

  return markets.reduce((acc, market) => {
    const longTokenAddress = market.longTokenAddress;
    const shortTokenAddress = market.shortTokenAddress;
    const indexTokenAddress = market.indexTokenAddress;

    if (!acc[longTokenAddress]) {
      acc[longTokenAddress] = [];
    }

    if (!acc[shortTokenAddress]) {
      acc[shortTokenAddress] = [];
    }

    if (!acc[indexTokenAddress]) {
      acc[indexTokenAddress] = [];
    }

    acc[longTokenAddress].push(market);
    acc[shortTokenAddress].push(market);
    acc[indexTokenAddress].push(market);

    return acc;
  }, {} as { [tokenAddress: string]: Market[] });
}

// TODO: finalize
export function getPositionMarketsPath(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  fromToken: string,
  toIndexToken: string,
  amountUsd: BigNumber
) {
  const marketsByTokens = getMarketsByTokens(marketsData);

  const initialMarkets = marketsByTokens[fromToken];

  const theSameMarketSwap = initialMarkets.find((market) => {
    return market.indexTokenAddress === toIndexToken;
  });

  if (theSameMarketSwap) {
    return [theSameMarketSwap.marketTokenAddress];
  }

  const targetMarkets = marketsByTokens[toIndexToken];

  let intercetedInitialMarket;
  let intercetedTargetMarket;
  let intersectionAddress;

  for (let targetMarket of targetMarkets) {
    for (let initialMarket of initialMarkets) {
      intersectionAddress = intersection(
        [targetMarket.longTokenAddress, targetMarket.shortTokenAddress],
        [initialMarket.longTokenAddress, initialMarket.shortTokenAddress]
      )[0];

      if (intersectionAddress && targetMarket.indexTokenAddress === toIndexToken) {
        intercetedInitialMarket = initialMarket;
        intercetedTargetMarket = targetMarket;
        break;
      }
    }
  }

  if (!intercetedInitialMarket || !intercetedTargetMarket) {
    return [];
  }

  const swapPath = [intercetedInitialMarket.marketTokenAddress, intercetedTargetMarket.marketTokenAddress];

  return swapPath;
}

// TODO: finalize
export function getSwapPath(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  fromToken: string,
  toToken: string,
  amountUsd: BigNumber
) {
  const marketsByTokens = getMarketsByTokens(marketsData);

  const initialMarkets = marketsByTokens[fromToken];

  const theSameMarketSwap = initialMarkets.find((market) => {
    return (
      [market.longTokenAddress, market.shortTokenAddress].includes(toToken) &&
      getTokenPoolAmount(marketsData, poolsData, market.marketTokenAddress, toToken)?.gt(amountUsd)
    );
  });

  if (theSameMarketSwap) {
    return [theSameMarketSwap.marketTokenAddress];
  }

  const targetMarkets = filterMarketsByLiquidity(marketsData, poolsData, marketsByTokens[toToken], toToken, amountUsd);

  let intercetedInitialMarket;
  let intercetedTargetMarket;
  let intersectionAddress;

  for (let targetMarket of targetMarkets) {
    for (let initialMarket of initialMarkets) {
      intersectionAddress = intersection(
        [targetMarket.longTokenAddress, targetMarket.shortTokenAddress],
        [initialMarket.longTokenAddress, initialMarket.shortTokenAddress]
      )[0];

      if (intersectionAddress) {
        intercetedInitialMarket = initialMarket;
        intercetedTargetMarket = targetMarket;
        break;
      }
    }
  }

  if (!intercetedInitialMarket || !intercetedTargetMarket) {
    return [];
  }

  const swapPath = [intercetedInitialMarket.marketTokenAddress, intercetedTargetMarket.marketTokenAddress];

  const isDoubleSwap = intersectionAddress !== toToken;

  if (isDoubleSwap) {
    swapPath.push(intercetedTargetMarket.marketTokenAddress);
  }

  return swapPath;
}
