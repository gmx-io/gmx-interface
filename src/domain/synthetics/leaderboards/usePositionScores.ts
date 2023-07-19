// import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { useTokenRecentPrices } from "../tokens";
import { PositionScores } from "./types";
import { useOpenPositions } from "./useOpenPositions";
import { BigNumber, utils } from "ethers";

export function usePositionScores() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const openPositions = useOpenPositions();

  console.log({ pricesData, openPositions });

  if (openPositions.error) {
    return { data: [], isLoading: false, error: openPositions.error };
  } else if (!pricesData || openPositions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<PositionScores> = [];

  for (let i = 0; i < openPositions.data.length; i++) {
    const p = openPositions.data[i];
    const tokenAddress = utils.getAddress(p.collateralToken);

    if (!(tokenAddress in pricesData)) {
      return { data: [], isLoading: false, error: new Error(`Unable to find price for token ${tokenAddress}`) };
    }

    const token = pricesData[tokenAddress];
    const value = p.sizeInTokens.mul(p.isLong ? token.minPrice : token.maxPrice);
    const unrealizedPnl = p.isLong ? value.sub(p.sizeInUsd) : p.sizeInTokens.sub(value);

    data.push({
      id: p.id,
      account: p.account,
      isLong: p.isLong,
      market: p.market,
      collateralToken: p.collateralToken,
      unrealizedPnl,
      entryPrice: p.entryPrice,
      sizeInUsd: value,
      liqPrice: BigNumber.from(0),
      collateralAmount: p.collateralAmount,
      maxSize: p.maxSize,
    });
  }

  return { data, isLoading: false, error: null };
};
