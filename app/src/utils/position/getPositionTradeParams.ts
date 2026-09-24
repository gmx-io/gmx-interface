import { PositionInfo } from '@/selectors/position/types';
import { TradeType } from '@/selectors/trade/types';

export function getPositionTradeParams(position: PositionInfo) {
  return {
    tradeType: position.isLong ? TradeType.Long : TradeType.Short,
    marketTokenAddress: position.marketTokenAddress.toBase58(),
    collateralTokenAddress: position.collateralTokenAddress.toBase58(),
    toTokenAddress: position.marketInfo.indexTokenAddress.toBase58(),
  };
}
