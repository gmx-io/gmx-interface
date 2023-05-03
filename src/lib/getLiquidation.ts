import { BigNumber } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  getLiquidationPriceFromDelta,
  LIQUIDATION_FEE,
  MARGIN_FEE_BASIS_POINTS,
  MAX_LEVERAGE,
} from "./legacy";

type GetLiquidationParams = {
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  isLong: boolean;
  fundingFee?: BigNumber;
};

function calculateTotalFees(size: BigNumber, fundingFees: BigNumber): BigNumber {
  return size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR).add(fundingFees).add(LIQUIDATION_FEE);
}

export function getLiquidation({ size, collateral, averagePrice, isLong, fundingFee }: GetLiquidationParams) {
  if (!size || !collateral || !averagePrice) {
    return;
  }

  const totalFees = calculateTotalFees(size, fundingFee || BigNumber.from("0"));
  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: totalFees,
    size,
    collateral,
    averagePrice,
    isLong,
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    size: size,
    collateral,
    averagePrice,
    isLong,
  });

  if (!liquidationPriceForFees) {
    return liquidationPriceForMaxLeverage;
  }

  if (!liquidationPriceForMaxLeverage) {
    return liquidationPriceForFees;
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage)
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage;
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage)
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage;
}

export default getLiquidation;
