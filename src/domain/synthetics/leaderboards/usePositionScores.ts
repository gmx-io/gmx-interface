import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { useTokenRecentPrices } from "../tokens";
import { PositionScores, RemoteData } from "./types";
import { useOpenPositions } from "./useOpenPositions";
import { BigNumber, utils } from "ethers";

export function usePositionScores() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const openPositions = useOpenPositions();
  const [positionScores, setPositionScores] = useState<RemoteData<PositionScores>>({
    isLoading: false,
    data: [],
    error: null,
  });

  useEffect(() => {
    if (openPositions.error) {
      setPositionScores(s => ({...s, error: openPositions.error}));
    } else if (!pricesData || !openPositions.data) {
      setPositionScores(s => ({...s, isLoading: true}));
    } else {
      const data: Array<PositionScores> = [];

      for (let i = 0; i < openPositions.data.length; i++) {
        const p = openPositions.data[i];
        const tokenAddress = utils.getAddress(p.collateralToken);

        if (!(tokenAddress in pricesData)) {
          setPositionScores(s => ({
            ...s,
            error: new Error(`Unable to find price for token ${tokenAddress}`)
          }));

          return;
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
          size: value,
          liqPrice: BigNumber.from(0),
          collateralAmount: p.collateralAmount,
        });
      }

      setPositionScores(s => ({
        ...s,
        isLoading: false,
        error: null,
        data,
      }));
    }
  }, [
    openPositions.data,
    openPositions.data.length,
    openPositions.error,
    pricesData
  ]);

  return positionScores;
};
