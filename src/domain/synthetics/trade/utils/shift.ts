import type { MarketInfo } from "domain/synthetics/markets/types";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
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
  const fromTokenPrice = getMidPrice(fromToken.prices);
  const toTokenPrice = getMidPrice(toToken.prices);

  if (strategy === "byFromToken") {
    values.fromTokenAmount = fromTokenAmount;
    values.fromTokenUsd = convertToUsd(fromTokenAmount, fromToken.decimals, fromTokenPrice)!;

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      marketTokenAmount: fromTokenAmount,
      uiFeeFactor: uiFeeFactor,
      strategy: "byMarketToken",
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
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
    values.toTokenUsd = convertToUsd(depositAmounts.marketTokenAmount, toToken.decimals, toTokenPrice)!;
  } else {
    values.toTokenAmount = toTokenAmount;
    values.toTokenUsd = convertToUsd(toTokenAmount, toToken.decimals, toTokenPrice)!;

    const depositAmounts = getDepositAmounts({
      marketInfo: toMarketInfo,
      marketToken: toToken,
      marketTokenAmount: toTokenAmount,
      strategy: "byMarketToken",
      longToken: toMarketInfo.longToken,
      shortToken: toMarketInfo.shortToken,
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      includeLongToken: true,
      includeShortToken: true,
      uiFeeFactor: 0n,
      forShift: true,
    });

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      longTokenAmount: depositAmounts.longTokenAmount,
      shortTokenAmount: depositAmounts.shortTokenAmount,
      strategy: "byCollaterals",
      marketTokenAmount: 0n,
      uiFeeFactor: uiFeeFactor,
      forShift: true,
    });

    values.fromLongTokenAmount = depositAmounts.longTokenAmount;
    values.fromShortTokenAmount = depositAmounts.shortTokenAmount;

    values.uiFeeUsd = withdrawalAmounts.uiFeeUsd;
    values.swapPriceImpactDeltaUsd = depositAmounts.swapPriceImpactDeltaUsd;

    values.fromTokenAmount = withdrawalAmounts.marketTokenAmount;
    values.fromTokenUsd = convertToUsd(withdrawalAmounts.marketTokenAmount, fromToken.decimals, fromTokenPrice)!;
  }

  return values;
}
