import { RemoteData, TopPositionsRow } from "./types";
import { useOpenPositions } from ".";

export function useTopPositions(p = (_) => 0): RemoteData<TopPositionsRow> {
  const positions = useOpenPositions(p);
  if (positions.data && positions.data.length) {
    p(`useTopPositions: parsing ${positions.data.length} top position rows`);
  }
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
