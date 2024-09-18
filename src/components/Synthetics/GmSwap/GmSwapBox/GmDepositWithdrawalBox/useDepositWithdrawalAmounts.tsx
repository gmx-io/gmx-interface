import { useMemo } from "react";

import { GlvInfo, MarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade/types";

import { TokenInputState } from "./types";

export function useDepositWithdrawalAmounts({
  isDeposit,
  isWithdrawal,
  marketInfo,
  marketToken,
  longTokenInputState,
  shortTokenInputState,
  marketTokenAmount,
  uiFeeFactor,
  focusedInput,
  marketTokensData,
  glvTokenAmount,
  glvToken,
  isMarketTokenDeposit,
  glvInfo,
}: {
  isDeposit: boolean;
  isWithdrawal: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longTokenInputState: TokenInputState | undefined;
  shortTokenInputState: TokenInputState | undefined;
  marketTokenAmount: bigint;
  glvTokenAmount: bigint;
  uiFeeFactor: bigint;
  focusedInput: string;
  glvToken: TokenData | undefined;
  marketTokensData: TokensData | undefined;
  isMarketTokenDeposit: boolean;
  glvInfo: GlvInfo | undefined;
}): DepositAmounts | WithdrawalAmounts | undefined {
  const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;

  const amounts = useMemo(() => {
    if (isDeposit) {
      if (!marketInfo || !marketToken || !marketTokensData) {
        return undefined;
      }

      let longTokenAmount;
      let shortTokenAmount;

      if (glvInfo) {
        longTokenAmount = (glvInfo.isSameCollaterals ? halfOfLong : longTokenInputState?.amount) || 0n;
        shortTokenAmount =
          (glvInfo.isSameCollaterals
            ? longTokenInputState?.amount !== undefined
              ? longTokenInputState.amount - longTokenAmount
              : undefined
            : shortTokenInputState?.amount) || 0n;
      } else {
        longTokenAmount = (marketInfo.isSameCollaterals ? halfOfLong : longTokenInputState?.amount) || 0n;
        shortTokenAmount =
          (marketInfo.isSameCollaterals
            ? longTokenInputState?.amount !== undefined
              ? longTokenInputState.amount - longTokenAmount
              : undefined
            : shortTokenInputState?.amount) || 0n;
      }

      return getDepositAmounts({
        marketInfo,
        marketToken,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        glvTokenAmount,
        includeLongToken: Boolean(longTokenInputState?.address),
        includeShortToken: Boolean(shortTokenInputState?.address),
        uiFeeFactor,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
        isMarketTokenDeposit,
        glvInfo,
        glvToken: glvToken!,
      });
    } else if (isWithdrawal) {
      if (!marketInfo || !marketToken || !marketTokensData) {
        return undefined;
      }

      let strategy;
      if (focusedInput === "market") {
        strategy = "byMarketToken";
      } else if (focusedInput === "longCollateral") {
        strategy = "byLongCollateral";
      } else {
        strategy = "byShortCollateral";
      }

      const longTokenAmount = marketInfo.isSameCollaterals ? halfOfLong ?? 0n : longTokenInputState?.amount ?? 0n;
      const shortTokenAmount = marketInfo.isSameCollaterals
        ? longTokenInputState?.amount !== undefined
          ? longTokenInputState?.amount - longTokenAmount
          : undefined ?? 0n
        : shortTokenInputState?.amount ?? 0n;

      return getWithdrawalAmounts({
        marketInfo,
        marketToken,
        marketTokenAmount,
        longTokenAmount,
        shortTokenAmount,
        strategy,
        uiFeeFactor,
        glvInfo,
        glvTokenAmount,
        glvToken,
      });
    }
  }, [
    focusedInput,
    halfOfLong,
    isDeposit,
    isMarketTokenDeposit,
    isWithdrawal,
    marketTokensData,
    longTokenInputState?.address,
    longTokenInputState?.amount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    shortTokenInputState?.address,
    shortTokenInputState?.amount,
    uiFeeFactor,
    glvInfo,
    glvToken,
    glvTokenAmount,
  ]);

  return amounts;
}
