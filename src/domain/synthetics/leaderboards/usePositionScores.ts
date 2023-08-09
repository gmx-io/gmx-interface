import { useChainId } from "lib/chains";
import { convertToUsd, useTokenRecentPrices } from "../tokens";
import { AccountOpenPosition, PositionScores } from "./types";
import { useOpenPositions } from "./useOpenPositions";
import { BigNumber, utils } from "ethers";
import { getToken } from "config/tokens";
import { getAddress } from "ethers/lib/utils";
import { getContractMarketPrices, useMarketsInfo } from "../markets";

export function usePositionScores() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const openPositions = useOpenPositions(chainId);
  const { tokensData } = useMarketsInfo(chainId);

  if (openPositions.error) {
    return { data: [], isLoading: false, error: openPositions.error };
  } else if (!pricesData || openPositions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<PositionScores> = [];

  for (let i = 0; i < openPositions.data.length; i++) {
    const p: AccountOpenPosition = openPositions.data[i];
    const collateralTokenAddress = utils.getAddress(p.collateralToken);

    if (!(collateralTokenAddress in pricesData)) {
      return { data: [], isLoading: false, error: new Error(`Unable to find price for token ${collateralTokenAddress}`) };
    }

    if (!p.marketData) {
      return { data: [], isLoading: true, error: null };
      // new Error(`Unable to identify market "${p.market}" in chain id: ${chainId}`) };
    }

    const collateralTokenPrices = pricesData[collateralTokenAddress];
    const collateralToken = getToken(chainId, getAddress(collateralTokenAddress));
    const collateralAmountUsd = convertToUsd(
      p.collateralAmount!,
      collateralToken.decimals,
      collateralTokenPrices.minPrice
    )!;

    const indexTokenAddress = utils.getAddress(p.marketData.indexTokenAddress);
    const indexToken = getToken(chainId, indexTokenAddress);
    const value = convertToUsd(
      p.sizeInTokens!,
      indexToken.decimals,
      p.isLong ? pricesData[indexTokenAddress].minPrice : pricesData[indexTokenAddress].maxPrice,
    )!;

    const unrealizedPnl = p.isLong ? value.sub(p.sizeInUsd) : p.sizeInUsd.sub(value);
    if (!tokensData || !p.marketData) {
      continue;
    }

    const contractMarketPrices = getContractMarketPrices(tokensData, p.marketData);

    if (!contractMarketPrices) {
      continue;
    }

    data.push({
      id: p.id,
      account: p.account,
      isLong: p.isLong,
      market: p.market,
      marketData: p.marketData,
      contractMarketPrices,
      collateralToken: p.collateralToken,
      unrealizedPnl,
      entryPrice: p.entryPrice,
      sizeInUsd: value,
      liqPrice: BigNumber.from(0),
      collateralAmount: p.collateralAmount,
      collateralAmountUsd,
      maxSize: p.maxSize,
      borrowingFeeUsd: p.borrowingFeeUsd,
      fundingFeeUsd: p.fundingFeeUsd,
      positionFeeUsd: p.positionFeeUsd,
      priceImpactUsd: p.priceImpactUsd,
    });
  }

  return { data, isLoading: false, error: null };
};
