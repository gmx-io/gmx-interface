import { MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { WitdhrawalAmounts } from "../types";

export function getWithdrawalAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  marketTokenAmount: BigNumber;
  longTokenAmount: BigNumber;
  shortTokenAmount: BigNumber;
  strategy: "byMarketToken" | "byLongCollateral" | "byShortCollateral";
}) {
  const { marketInfo, marketToken, marketTokenAmount, longTokenAmount, shortTokenAmount, strategy } = p;

  const { longToken, shortToken } = marketInfo;

  const longPoolAmount = marketInfo.longPoolAmount;
  const shortPoolAmount = marketInfo.shortPoolAmount;

  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longToken.prices.maxPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortToken.prices.maxPrice)!;

  const totalPoolUsd = longPoolUsd.add(shortPoolUsd);

  const values: WitdhrawalAmounts = {
    marketTokenAmount: BigNumber.from(0),
    marketTokenUsd: BigNumber.from(0),
    longTokenAmount: BigNumber.from(0),
    longTokenUsd: BigNumber.from(0),
    shortTokenAmount: BigNumber.from(0),
    shortTokenUsd: BigNumber.from(0),
    swapFeeUsd: BigNumber.from(0),
    swapPriceImpactDeltaUsd: BigNumber.from(0),
  };

  if (totalPoolUsd.eq(0)) {
    return values;
  }

  if (strategy === "byMarketToken") {
    values.marketTokenAmount = marketTokenAmount;
    values.marketTokenUsd = marketTokenAmountToUsd(marketInfo, marketToken, marketTokenAmount)!;

    values.longTokenUsd = values.marketTokenUsd.mul(longPoolUsd).div(totalPoolUsd);
    values.shortTokenUsd = values.marketTokenUsd.mul(shortPoolUsd).div(totalPoolUsd);

    const longSwapFeeUsd = applyFactor(values.longTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const shortSwapFeeUsd = applyFactor(values.shortTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);

    values.swapFeeUsd = longSwapFeeUsd.add(shortSwapFeeUsd);

    values.longTokenUsd = values.longTokenUsd.sub(longSwapFeeUsd);
    values.shortTokenUsd = values.shortTokenUsd.sub(shortSwapFeeUsd);

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longToken.prices.maxPrice)!;
    values.shortTokenAmount = convertToTokenAmount(
      values.shortTokenUsd,
      shortToken.decimals,
      shortToken.prices.maxPrice
    )!;
  } else {
    if (strategy === "byLongCollateral" && longPoolUsd.gt(0)) {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
      values.shortTokenUsd = values.longTokenUsd.mul(shortPoolUsd).div(longPoolUsd);
      values.shortTokenAmount = convertToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    } else if (strategy === "byShortCollateral" && shortPoolUsd.gt(0)) {
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
      values.longTokenUsd = values.shortTokenUsd.mul(longPoolUsd).div(shortPoolUsd);
      values.longTokenAmount = convertToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
    }

    values.marketTokenUsd = values.longTokenUsd.add(values.shortTokenUsd);
    values.swapFeeUsd = applyFactor(values.marketTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);

    values.marketTokenUsd = values.marketTokenUsd.sub(values.swapFeeUsd);
    values.marketTokenAmount = usdToMarketTokenAmount(marketInfo, marketToken, values.marketTokenUsd)!;
  }

  return values;
}
