import { RemoteData, TopPositionsRow } from "./types";
import { useAccountOpenPositions } from ".";

export function useTopPositions(): RemoteData<TopPositionsRow> {
  const positions = useAccountOpenPositions();
  return {
    isLoading: !positions.data,
    error: positions.error,
    data: positions.data.map((p, i) => ({
      key: p.key,
      rank: i,
      account: p.account,
      unrealizedPnl: p.unrealizedPnlAfterFees,
      market: p.marketInfo,
      entryPrice: p.entryPrice,
      size: p.sizeInUsd,
      liqPrice: p.liquidationPrice,
      isLong: p.isLong,
    })),
  };
}
