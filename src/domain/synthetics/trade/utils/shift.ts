import { marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import type { MarketInfo } from "domain/synthetics/markets/types";
import type { TokenData } from "domain/synthetics/tokens/types";

import { getDepositAmounts } from "./deposit";
import { getWithdrawalAmounts } from "./withdrawal";

export type ShiftAmounts = {
  fromTokenAmount: bigint;
  fromTokenUsd: bigint;
  fromLongTokenAmount: bigint;
  fromShortTokenAmount: bigint;
  toTokenAmount: bigint;
  toTokenUsd: bigint;
  uiFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
};

export function getShiftAmounts({
  strategy,
  fromToken,
  fromMarketInfo,
  toToken,
  toMarketInfo,
  fromTokenAmount,
  toTokenAmount,
  uiFeeFactor,
}: {
  strategy: "byFromToken" | "byToToken";
  fromToken: TokenData;
  fromMarketInfo: MarketInfo;
  toToken: TokenData;
  toMarketInfo: MarketInfo;
  fromTokenAmount: bigint;
  toTokenAmount: bigint;
  uiFeeFactor: bigint;
}): ShiftAmounts {
  const values: ShiftAmounts = {
    fromTokenAmount: 0n,
    fromTokenUsd: 0n,
    fromLongTokenAmount: 0n,
    fromShortTokenAmount: 0n,
    toTokenAmount: 0n,
    toTokenUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
  };

  if (strategy === "byFromToken") {
    values.fromTokenAmount = fromTokenAmount;
    values.fromTokenUsd = marketTokenAmountToUsd(fromMarketInfo, fromToken, fromTokenAmount);

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      marketTokenAmount: fromTokenAmount,
      strategy: "byMarketToken",
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      uiFeeFactor: uiFeeFactor,
      forShift: true,
    });

    const depositAmounts = getDepositAmounts({
      marketInfo: toMarketInfo,
      marketToken: toToken,
      longToken: toMarketInfo.longToken,
      shortToken: toMarketInfo.shortToken,
      longTokenAmount: withdrawalAmounts.longTokenAmount,
      shortTokenAmount: withdrawalAmounts.shortTokenAmount,
      marketTokenAmount: 0n,
      strategy: "byCollaterals",
      includeLongToken: false,
      includeShortToken: false,
      uiFeeFactor: 0n,
      forShift: true,
    });

    values.fromLongTokenAmount = withdrawalAmounts.longTokenAmount;
    values.fromShortTokenAmount = withdrawalAmounts.shortTokenAmount;

    values.uiFeeUsd = withdrawalAmounts.uiFeeUsd;
    values.swapPriceImpactDeltaUsd = depositAmounts.swapPriceImpactDeltaUsd;

    values.toTokenAmount = depositAmounts.marketTokenAmount;
    values.toTokenUsd = marketTokenAmountToUsd(toMarketInfo, toToken, depositAmounts.marketTokenAmount);
  } else {
    values.toTokenAmount = toTokenAmount;
    values.toTokenUsd = marketTokenAmountToUsd(toMarketInfo, toToken, toTokenAmount);

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      strategy: "byMarketToken",
      marketTokenAmount: usdToMarketTokenAmount(fromMarketInfo, fromToken, values.toTokenUsd),
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      uiFeeFactor: uiFeeFactor,
      forShift: true,
    });

    const depositAmounts = getDepositAmounts({
      marketInfo: toMarketInfo,
      marketToken: toToken,
      strategy: "byCollaterals",
      longToken: toMarketInfo.longToken,
      longTokenAmount: withdrawalAmounts.longTokenAmount,
      shortToken: toMarketInfo.shortToken,
      shortTokenAmount: withdrawalAmounts.shortTokenAmount,
      marketTokenAmount: 0n,
      includeLongToken: true,
      includeShortToken: true,
      uiFeeFactor: 0n,
      forShift: true,
    });

    values.fromLongTokenAmount = depositAmounts.longTokenAmount;
    values.fromShortTokenAmount = depositAmounts.shortTokenAmount;

    values.uiFeeUsd = withdrawalAmounts.uiFeeUsd;
    values.swapPriceImpactDeltaUsd = depositAmounts.swapPriceImpactDeltaUsd;

    // Hack to try to take price impact into account during reverse calculation
    values.fromTokenAmount =
      withdrawalAmounts.marketTokenAmount -
      usdToMarketTokenAmount(fromMarketInfo, fromToken, values.swapPriceImpactDeltaUsd);
    values.fromTokenUsd = marketTokenAmountToUsd(fromMarketInfo, fromToken, values.fromTokenAmount);
  }

  return values;
}
