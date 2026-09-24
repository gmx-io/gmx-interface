import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxSelectedPositionAddress } from '../tradebox/selectTradeboxSelectedPositionAddress';
import { selectTradeboxCollateralToken } from '../tradebox/selectTradeboxCollateralToken';
import { selectTradeboxMarketInfo } from '../tradebox/selectTradeboxMarketInfo';
import { selectTradeboxSelectedPosition } from '../tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxTradeFlags } from '../tradebox/selectTradeboxTradeFlags';
import { selectTradeboxNextPositionValues } from '../tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxIncreasePositionAmounts } from '../tradebox/selectTradeboxIncreasePositionAmounts';
import { PositionInfo } from '@/selectors/position/types';
import { PublicKey } from '@solana/web3.js';

export const selectTradeboxMockPosition = createAppStoreSelector(
  [
    selectTradeboxSelectedPositionAddress,
    selectTradeboxCollateralToken,
    selectTradeboxMarketInfo,
    selectTradeboxSelectedPosition,
    selectTradeboxTradeFlags,
    selectTradeboxNextPositionValues,
    selectTradeboxIncreasePositionAmounts,
  ],
  (
    positionKey,
    collateralToken,
    marketInfo,
    existingPosition,
    tradeFlags,
    nextPositionValues,
    increaseAmounts
  ): PositionInfo | undefined => {
    if (
      !positionKey ||
      !marketInfo ||
      !collateralToken ||
      !increaseAmounts ||
      !nextPositionValues
    ) {
      return undefined;
    }

    return {
      address: new PublicKey(positionKey),
      owner: existingPosition?.owner ?? PublicKey.default,
      sizeInUsd: (existingPosition?.sizeInUsd ?? BN_ZERO).add(
        increaseAmounts?.sizeDeltaUsd ?? BN_ZERO
      ),
      sizeInTokens: (existingPosition?.sizeInTokens ?? BN_ZERO).add(
        increaseAmounts?.sizeDeltaInTokens ?? BN_ZERO
      ),
      collateralAmount: (existingPosition?.collateralAmount ?? BN_ZERO).add(
        increaseAmounts?.collateralDeltaAmount ?? BN_ZERO
      ),
      isLong: existingPosition?.isLong ?? tradeFlags.isLong,
      marketInfo,
      marketTokenAddress: marketInfo.marketTokenAddress,
      indexToken: marketInfo.indexToken,

      collateralTokenAddress: collateralToken.address,
      pnlToken: tradeFlags.isLong
        ? marketInfo.longToken
        : marketInfo.shortToken,
      markPrice: nextPositionValues.nextEntryPrice!,
      entryPrice: nextPositionValues.nextEntryPrice,
      liquidationPrice: nextPositionValues.nextLiqPrice,
      collateralToken,
      collateralUsd: increaseAmounts?.initialCollateralUsd,
      remainingCollateralUsd: increaseAmounts?.collateralDeltaUsd,
      remainingCollateralAmount: increaseAmounts?.collateralDeltaAmount,
      netValue: increaseAmounts?.collateralDeltaUsd,
      hasLowCollateral: false,
      leverage: nextPositionValues.nextLeverage,
      leverageWithPnl: nextPositionValues.nextLeverage,
      pnl: BN_ZERO,
      pnlPercentage: 0,
      pnlAfterFees: BN_ZERO,
      pnlAfterFeesPercentage: 0,
      closingFeeUsd: BN_ZERO,
      pendingFundingFeesUsd: BN_ZERO,
      pendingBorrowingFeesUsd: BN_ZERO,
      pendingClaimableFundingFeesUsd: BN_ZERO,
      fundingFeeAmountPerSize: BN_ZERO,
      longTokenClaimableFundingAmountPerSize: BN_ZERO,
      shortTokenClaimableFundingAmountPerSize: BN_ZERO,
      borrowingFactor: BN_ZERO,
    };
  }
);
