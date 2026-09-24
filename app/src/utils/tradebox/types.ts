import { SwapPathStats, TriggerThresholdType } from '@/selectors/trade/types';
import { BN } from '@coral-xyz/anchor';
import { OrderType } from '@/selectors/order/types';

export enum DecreasePositionSwapType {
  NoSwap = 0,
  SwapPnlTokenToCollateralToken = 1,
  SwapCollateralTokenToPnlToken = 2,
}

export type DecreasePositionAmounts = {
  isFullClose: boolean;
  sizeDeltaUsd: BN;
  sizeDeltaInTokens: BN;
  collateralDeltaUsd: BN;
  collateralDeltaAmount: BN;

  swapPathStats: SwapPathStats | undefined;

  indexPrice: BN;
  collateralPrice: BN;
  triggerPrice?: BN;
  acceptablePrice: BN;
  acceptablePriceDeltaBps: number;
  recommendedAcceptablePriceDeltaBps: number;

  estimatedPnl: BN;
  estimatedPnlPercentage: number;
  realizedPnl: BN;
  realizedPnlPercentage: number;

  positionFeeUsd: BN;
  gtRewardsUsd: BN;
  feeDiscountUsd: BN;
  borrowingFeeUsd: BN;
  fundingFeeUsd: BN;
  swapProfitFeeUsd: BN;
  positionPriceImpactDeltaUsd: BN;
  priceImpactDiffUsd: BN;
  payedRemainingCollateralAmount: BN;

  payedOutputUsd: BN;
  payedRemainingCollateralUsd: BN;

  receiveTokenAmount: BN;
  receiveUsd: BN;

  triggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  triggerThresholdType?: TriggerThresholdType;
  decreaseSwapType: DecreasePositionSwapType;
};

export type IncreasePositionAmounts = {
  initialCollateralAmount: BN;
  initialCollateralUsd: BN;

  collateralDeltaAmount: BN;
  collateralDeltaUsd: BN;

  swapPathStats: SwapPathStats | undefined;

  indexTokenAmount: BN;

  sizeDeltaUsd: BN;
  sizeDeltaInTokens: BN;

  estimatedLeverage?: BN;

  indexPrice: BN;
  initialCollateralPrice: BN;
  collateralPrice: BN;
  triggerPrice?: BN;
  triggerThresholdType?: TriggerThresholdType;
  acceptablePrice: BN;
  acceptablePriceDeltaBps: number;

  positionFeeUsd: BN;
  gtRewardsUsd: BN;
  feeDiscountUsd: BN;
  borrowingFeeUsd: BN;
  fundingFeeUsd: BN;
  positionPriceImpactDeltaUsd: BN;
};
