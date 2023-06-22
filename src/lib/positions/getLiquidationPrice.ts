import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, LIQUIDATION_FEE, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE } from "../legacy";

type GetLiquidationParams = {
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  isLong: boolean;
  fundingFee?: BigNumber;
};

export function getLiquidationPriceFromDelta({
  liquidationAmount,
  size,
  collateral,
  averagePrice,
  isLong,
}: {
  liquidationAmount: BigNumber;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  isLong: boolean;
}) {
  if (!size || size.eq(0)) {
    return;
  }

  if (liquidationAmount.gt(collateral)) {
    const liquidationDelta = liquidationAmount.sub(collateral);
    const priceDelta = liquidationDelta.mul(averagePrice).div(size);

    return isLong ? averagePrice.add(priceDelta) : averagePrice.sub(priceDelta);
  }

  const liquidationDelta = collateral.sub(liquidationAmount);
  const priceDelta = liquidationDelta.mul(averagePrice).div(size);

  return isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta);
}

function calculateTotalFees(size: BigNumber, fundingFees: BigNumber): BigNumber {
  return size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR).add(fundingFees).add(LIQUIDATION_FEE);
}

export function getLiquidationPrice({ size, collateral, averagePrice, isLong, fundingFee }: GetLiquidationParams) {
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

export default getLiquidationPrice;
