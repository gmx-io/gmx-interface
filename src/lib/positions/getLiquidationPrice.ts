import { BigNumber } from "ethers";
import { LIQUIDATION_FEE, MARGIN_FEE_BASIS_POINTS } from "../legacy";
import { BASIS_POINTS_DIVISOR, MAX_LEVERAGE } from "config/factors";

type GetLiquidationParams = {
  size: bigint;
  collateral: bigint;
  averagePrice: bigint;
  isLong: boolean;
  fundingFee?: bigint;
};

export function getLiquidationPriceFromDelta({
  liquidationAmount,
  size,
  collateral,
  averagePrice,
  isLong,
}: {
  liquidationAmount: bigint;
  size: bigint;
  collateral: bigint;
  averagePrice: bigint;
  isLong: boolean;
}) {
  if (!size || size == 0n) {
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

function calculateTotalFees(size: bigint, fundingFees: BigNumber): BigNumber {
  return size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR).add(fundingFees).add(LIQUIDATION_FEE);
}

export function getLiquidationPrice({ size, collateral, averagePrice, isLong, fundingFee }: GetLiquidationParams) {
  if (!size || !collateral || !averagePrice) {
    return;
  }

  const totalFees = calculateTotalFees(size, fundingFee || BigInt("0"));
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
