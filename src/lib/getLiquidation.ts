import { BigNumber } from "ethers";
import {
  BASIS_POINTS_DIVISOR,
  getLiquidationPriceFromDelta,
  LIQUIDATION_FEE,
  MARGIN_FEE_BASIS_POINTS,
  MAX_LEVERAGE,
} from "./legacy";
import compact from "lodash/compact";

type GetLiquidationParams = {
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  fees: BigNumber[];
  isLong: boolean;
};

function calculateTotalFees(size: BigNumber, otherFees: BigNumber[]): BigNumber {
  otherFees = compact(otherFees);
  let totalFees = size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR).add(LIQUIDATION_FEE);

  if (otherFees?.length > 0) {
    totalFees = totalFees.add(otherFees.reduce((a, b) => a.add(b)));
  }
  return totalFees;
}

export function getLiquidation({ size, collateral, averagePrice, fees, isLong }: GetLiquidationParams) {
  if (!size || !collateral || !averagePrice) {
    return;
  }

  const totalFees = calculateTotalFees(size, fees);

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

  console.log(
    {
      liquidationPriceForFees: liquidationPriceForFees?.toString() / 1e30,
      liquidationPriceForMaxLeverage: liquidationPriceForMaxLeverage?.toString() / 1e30,
      totalFees: Number(totalFees?.toString()) / 1e30,
    },
    "✅"
  );

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
