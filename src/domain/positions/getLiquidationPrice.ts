import { bigMath } from "lib/bitMath";
import { BASIS_POINTS_DIVISOR_BIGINT, LIQUIDATION_FEE, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE } from "lib/legacy";


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
  if (size == undefined || BigInt(size) == BigInt(0)) {
    return;
  }

  if (liquidationAmount > collateral) {
    const liquidationDelta = liquidationAmount - collateral;
    const priceDelta = bigMath.mulDiv(liquidationDelta, averagePrice, size);

    return isLong ? averagePrice + priceDelta : averagePrice - priceDelta;
  }

  const liquidationDelta = collateral - liquidationAmount;
  const priceDelta = bigMath.mulDiv(liquidationDelta, averagePrice, size);

  return isLong ? averagePrice - priceDelta : averagePrice + priceDelta;
}

function calculateTotalFees(size: bigint, fundingFees: bigint): bigint {
    return BigInt(0);
//   return (
//     bigMath.mulDiv(size, BigInt(MARGIN_FEE_BASIS_POINTS), BASIS_POINTS_DIVISOR_BIGINT) + fundingFees + LIQUIDATION_FEE
//   );
}

export function getLiquidationPrice({ size, collateral, averagePrice, isLong, fundingFee }: GetLiquidationParams) {
  if (size === undefined || collateral === undefined || averagePrice === undefined) {
    return;
  }

  const totalFees = calculateTotalFees(size, fundingFee ?? BigInt(0));
  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: totalFees,
    size,
    collateral,
    averagePrice,
    isLong,
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: bigMath.mulDiv(size, BASIS_POINTS_DIVISOR_BIGINT, BigInt(MAX_LEVERAGE)),
    size: size,
    collateral,
    averagePrice,
    isLong,
  });

  if (liquidationPriceForFees === undefined) {
    return liquidationPriceForMaxLeverage;
  }

  if (liquidationPriceForMaxLeverage === undefined) {
    return liquidationPriceForFees;
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees > liquidationPriceForMaxLeverage
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage;
  }

  // return the lower price
  return liquidationPriceForFees < liquidationPriceForMaxLeverage
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage;
}

export default getLiquidationPrice;
