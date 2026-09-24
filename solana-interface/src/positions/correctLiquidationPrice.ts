import { ONE_GMTRADE_USD } from "../config/solanaProgram";

export type CorrectLiquidationPriceInput = {
  /** SDK liquidation price (20 decimals, per smallest index token unit). */
  liquidationPrice: bigint | undefined;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  isLong: boolean;
  isCollateralIndexToken: boolean;
  minCollateralFactor: bigint;
  minCollateralFactorForLiquidation: bigint;
};

/**
 * Source: gmx-solana-interface/app/src/hooks/fetchHooks/usePositions.ts `correctLiquidationPrice`.
 * The SDK derives the liquidation price from `minCollateralFactor`; the program liquidates using
 * `minCollateralFactorForLiquidation`. Shift the price by the collateral delta the two factors imply.
 * Returns undefined when the corrected price is not positive.
 */
export function correctLiquidationPrice(input: CorrectLiquidationPriceInput): bigint | undefined {
  const { liquidationPrice, minCollateralFactor, minCollateralFactorForLiquidation } = input;
  if (liquidationPrice === undefined) return undefined;
  if (minCollateralFactor === minCollateralFactorForLiquidation) return liquidationPrice;
  if (input.sizeInTokens === 0n) return liquidationPrice;

  const deltaCollateral =
    (input.sizeInUsd * (minCollateralFactorForLiquidation - minCollateralFactor)) / ONE_GMTRADE_USD;
  if (deltaCollateral === 0n) return liquidationPrice;

  let denominator: bigint;
  if (input.isCollateralIndexToken) {
    denominator = input.isLong
      ? input.sizeInTokens + input.collateralAmount
      : input.sizeInTokens - input.collateralAmount;
  } else {
    denominator = input.isLong ? input.sizeInTokens : -input.sizeInTokens;
  }
  if (denominator === 0n) return liquidationPrice;

  const corrected = liquidationPrice + deltaCollateral / denominator;
  return corrected <= 0n ? undefined : corrected;
}
