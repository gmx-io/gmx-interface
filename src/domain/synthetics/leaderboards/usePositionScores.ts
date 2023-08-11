import { useChainId } from "lib/chains";
import { convertToUsd, useTokenRecentPrices } from "../tokens";
import { AccountOpenPosition, PositionScores } from "./types";
import { useAccountOpenPositions } from "./useOpenPositions";
import { BigNumber } from "ethers";
import { getToken } from "config/tokens";
import { getAddress } from "ethers/lib/utils";
import { usePositionsInfo } from "./usePositionsInfo";
import { getPositionKey } from "../positions";

export function usePositionScores() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const accountOpenPositions = useAccountOpenPositions(chainId);
  const positionsByKey = usePositionsInfo(
    chainId,
    accountOpenPositions.data.map(p => p.id),
    accountOpenPositions.data.map(p => p.contractMarketPrices)
  );

  if (accountOpenPositions.error) {
    return { data: [], isLoading: false, error: accountOpenPositions.error };
  } else if (!pricesData || accountOpenPositions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<PositionScores> = [];

  for (let i = 0; i < accountOpenPositions.data.length; i++) {
    const p: AccountOpenPosition = accountOpenPositions.data[i];
    const collateralTokenAddress = getAddress(p.collateralToken);

    if (!(collateralTokenAddress in pricesData)) {
      return { data: [], isLoading: false, error: new Error(`Unable to find price for token ${collateralTokenAddress}`) };
    }

    const collateralTokenPrices = pricesData[collateralTokenAddress];
    const collateralToken = getToken(chainId, getAddress(collateralTokenAddress));
    const collateralAmountUsd = convertToUsd(
      p.collateralAmount!,
      collateralToken.decimals,
      collateralTokenPrices.minPrice
    )!;

    const indexTokenAddress = getAddress(p.marketData.indexTokenAddress);
    const indexToken = getToken(chainId, indexTokenAddress);
    const value = convertToUsd(
      p.sizeInTokens!,
      indexToken.decimals,
      p.isLong ? pricesData[indexTokenAddress].minPrice : pricesData[indexTokenAddress].maxPrice,
    )!;

    const unrealizedPnl = p.isLong ? value.sub(p.sizeInUsd) : p.sizeInUsd.sub(value);
    const key = getPositionKey(
      getAddress(p.account),
      getAddress(p.market),
      getAddress(p.collateralToken),
      p.isLong
    );

    data.push({
      id: p.id,
      info: positionsByKey.data[key],
      account: p.account,
      isLong: p.isLong,
      market: p.market,
      marketData: p.marketData,
      contractMarketPrices: p.contractMarketPrices,
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
