import { RemoteData, TopPositionsRow } from "./types";
import { useOpenPositions } from ".";

export function useTopPositions(): RemoteData<TopPositionsRow> {
  const positions = useOpenPositions();
  return {
    isLoading: !positions.data,
    error: positions.error,
    data: positions.data.map((p, i) => {
      return {
        key: p.key,
        rank: i,
        account: p.account,
        ensName: p.ensName,
        avatarUrl: p.avatarUrl,
        unrealizedPnl: p.unrealizedPnlAfterFees,
        market: p.marketInfo,
        direction: p.isLong,
        entryPrice: p.entryPrice,
        size: p.sizeInUsd,
        isLong: p.isLong,
        markPrice: p.markPrice,
        liqPrice: p.liquidationPrice,
        liqPriceDelta: p.liquidationPriceDelta,
        liqPriceDeltaRel: p.liquidationPriceDeltaRel,
        leverage: p.leverage,
        collateral: p.collateralAmountUsd
      };
    }),
  };
}
