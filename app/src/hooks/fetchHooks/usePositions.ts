/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ONE_USD } from '@/config/constants';
import { getGmw200Enabled } from '@/config/featureFlagEnable';
import { MarketState } from '@/selectors/market/types';
import { Position } from '@/selectors/position/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { findPositionPDAWithKind } from 'gmsol';

// Re-export of the marin subscription path. The legacy 5s polling +
// Helius transactionSubscribe + cascade getMultipleAccountsInfo
// implementation lived in this file until the marin migration cleanup;
// consult git history for the prior implementation if a reference is
// needed.
// export { useMarinPositions as usePositions } from '@/hooks/marin/useMarinPositions';

// 2026-6-12: use useOnChainPositions hooks to get the positions on chain (RPC).
export { useOnChainPositions as usePositions } from '@/hooks/fetchHooks/useOnChainPositions';

// Helper functions kept here because the marin path imports them directly.
// They are pure transformations on a decoded `position` account and do not
// depend on the legacy polling pipeline.

export function processPosition(
  position: any,
  owner: string,
  store: string
): Position | undefined {
  if (!position || !(position.kind === 1 || position.kind === 2)) return;
  if (position.state.sizeInUsd.isZero()) return;

  return {
    address: findPositionPDAWithKind(
      new PublicKey(store),
      new PublicKey(owner),
      position.marketToken,
      position.collateralToken,
      position.kind
    )[0],
    owner: new PublicKey(owner),
    marketTokenAddress: position.marketToken,
    collateralTokenAddress: position.collateralToken,
    isLong: position.kind === 1,
    sizeInUsd: position.state.sizeInUsd,
    sizeInTokens: position.state.sizeInTokens,
    collateralAmount: position.state.collateralAmount,
    borrowingFactor: position.state.borrowingFactor,
    fundingFeeAmountPerSize: position.state.fundingFeeAmountPerSize,
    longTokenClaimableFundingAmountPerSize:
      position.state.longTokenClaimableFundingAmountPerSize,
    shortTokenClaimableFundingAmountPerSize:
      position.state.shortTokenClaimableFundingAmountPerSize,
    increasedAt: position.state.increasedAt,
    decreasedAt: position.state.decreasedAt,
    updatedAtSlot: position.state.updatedAtSlot,
    tradeId: position.state.tradeId,
  };
}

export function correctLiquidationPrice(
  statusData: any,
  positionObj: any,
  marketState: MarketState | undefined,
  indexToken: string
): any {
  if (!getGmw200Enabled()) return statusData;
  if (!statusData.liquidation_price || !marketState) return statusData;

  const oldFactor = marketState.minCollateralFactor;
  const newFactor = marketState.minCollateralFactorForLiquidation;
  if (!oldFactor || !newFactor || oldFactor.eq(newFactor)) return statusData;

  const sizeInUsd = positionObj.state.sizeInUsd;
  const sizeInTokens = positionObj.state.sizeInTokens;
  const collateralAmount = positionObj.state.collateralAmount;
  const isLong = positionObj.kind === 1;
  const collateralToken = positionObj.collateralToken.toBase58();

  if (sizeInTokens.isZero()) return statusData;

  const deltaCollateral = sizeInUsd.mul(newFactor.sub(oldFactor)).div(ONE_USD);
  const isCollateralIndexToken = collateralToken === indexToken;

  let denominator: BN;
  if (isCollateralIndexToken) {
    denominator = isLong
      ? sizeInTokens.add(collateralAmount)
      : sizeInTokens.sub(collateralAmount);
  } else {
    denominator = isLong ? sizeInTokens : sizeInTokens.neg();
  }

  if (denominator.isZero()) return statusData;

  const oldLiqPrice = new BN(statusData.liquidation_price.toString());
  const priceDelta = deltaCollateral.div(denominator);
  const newLiqPrice = oldLiqPrice.add(priceDelta);

  return {
    ...statusData,
    liquidation_price: newLiqPrice.lten(0)
      ? undefined
      : BigInt(newLiqPrice.toString()),
  };
}
