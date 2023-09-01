import { RemoteData, TopPositionsRow } from "./types";
import { useAccountOpenPositions } from ".";

export function useTopPositions(): RemoteData<TopPositionsRow> {
  const positions = useAccountOpenPositions();
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
        entryPrice: p.entryPrice,
        size: p.sizeInUsd,
        isLong: p.isLong,
        markPrice: p.markPrice,
        liqPrice: p.liquidationPrice,
        liqPriceDelta: p.liquidationPriceDelta,
        liqPriceDeltaRel: p.liquidationPriceDeltaRel,
      };
    }),
  };
}
