import { useMemo } from "react";

import { MarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade/types";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";
import { TokenInputState } from "./types";

export function useDepositWithdrawalAmounts({
  isDeposit,
  isWithdrawal,
  marketInfo,
  marketToken,
  longTokenInputState,
  shortTokenInputState,
  gmTokenInputState,
  marketTokenAmount,
  uiFeeFactor,
  focusedInput,
  marketTokensData,
  isMarketTokenDeposit,
  vaultInfo,
  targetGmMarket,
  targetGmMarketToken,
}: {
  isDeposit: boolean;
  isWithdrawal: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longTokenInputState: TokenInputState | undefined;
  shortTokenInputState: TokenInputState | undefined;
  gmTokenInputState: TokenInputState | undefined;
  marketTokenAmount: bigint;
  uiFeeFactor: bigint;
  focusedInput: string;
  marketTokensData: TokensData | undefined;
  isMarketTokenDeposit: boolean;
  vaultInfo: GlvMarketInfo | undefined;
  targetGmMarket: MarketInfo | undefined;
  targetGmMarketToken: TokenData | undefined;
}): DepositAmounts | WithdrawalAmounts | undefined {
  const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;

  const amounts = useMemo(() => {
    if (isDeposit) {
      if (!marketInfo || !marketToken || !marketTokensData || !targetGmMarket || !targetGmMarketToken) {
        return undefined;
      }

      const longTokenAmount = (marketInfo.isSameCollaterals ? halfOfLong : longTokenInputState?.amount) || 0n;
      const shortTokenAmount =
        (marketInfo.isSameCollaterals
          ? longTokenInputState?.amount !== undefined
            ? longTokenInputState.amount - longTokenAmount
            : undefined
          : shortTokenInputState?.amount) || 0n;
      const gmTokenAmount = gmTokenInputState?.amount || 0n;

      return getDepositAmounts({
        marketInfo: targetGmMarket,
        marketToken: targetGmMarketToken,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        gmToken: gmTokenInputState?.isGm ? marketTokensData[gmTokenInputState?.address] : undefined,
        longTokenAmount,
        shortTokenAmount,
        gmTokenAmount,
        marketTokenAmount,
        includeLongToken: Boolean(longTokenInputState?.address),
        includeShortToken: Boolean(shortTokenInputState?.address),
        uiFeeFactor,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
        isMarketTokenDeposit,
        vaultInfo,
      });
    } else if (isWithdrawal) {
      if (!marketInfo || !marketToken || !marketTokensData || !targetGmMarket || !targetGmMarketToken) {
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
        marketInfo: targetGmMarket,
        marketToken: targetGmMarketToken,
        marketTokenAmount,
        longTokenAmount,
        shortTokenAmount,
        strategy,
        uiFeeFactor,
        vaultInfo,
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
    vaultInfo,
    gmTokenInputState?.address,
    gmTokenInputState?.amount,
    gmTokenInputState?.isGm,
    targetGmMarket,
    targetGmMarketToken,
  ]);

  return amounts;
}
