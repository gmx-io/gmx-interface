import { useMemo } from "react";

import { MarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade/types";
import { GlvMarketInfo } from "domain/synthetics/tokens/useGlvMarkets";

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
  isMarketTokenDeposit,
  vaultInfo,
}: {
  isDeposit: boolean;
  isWithdrawal: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longTokenInputState:
    | {
        address: string;
        amount?: bigint | undefined;
        isGm?: boolean;
      }
    | undefined;
  shortTokenInputState:
    | {
        address: string;
        amount?: bigint | undefined;
      }
    | undefined;
  marketTokenAmount: bigint;
  uiFeeFactor: bigint;
  focusedInput: string;
  marketTokensData?: TokensData;
  isMarketTokenDeposit: boolean;
  vaultInfo?: GlvMarketInfo;
}): DepositAmounts | WithdrawalAmounts | undefined {
  const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;

  const amounts = useMemo(() => {
    if (isDeposit) {
      if (!marketInfo || !marketToken || !marketTokensData) {
        return undefined;
      }

      const longTokenAmount = (marketInfo.isSameCollaterals ? halfOfLong : longTokenInputState?.amount) || 0n;
      const shortTokenAmount =
        (marketInfo.isSameCollaterals
          ? longTokenInputState?.amount !== undefined
            ? longTokenInputState.amount - longTokenAmount
            : undefined
          : shortTokenInputState?.amount) || 0n;

      return getDepositAmounts({
        marketInfo,
        marketToken,
        longToken: longTokenInputState?.isGm ? marketTokensData[longTokenInputState?.address] : marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        includeLongToken: Boolean(longTokenInputState?.address),
        includeShortToken: Boolean(shortTokenInputState?.address),
        uiFeeFactor,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
        isMarketTokenDeposit,
        vaultInfo,
      });
    } else if (isWithdrawal) {
      if (!marketInfo || !marketToken) {
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
    longTokenInputState?.isGm,
    longTokenInputState?.amount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    shortTokenInputState?.address,
    shortTokenInputState?.amount,
    uiFeeFactor,
    vaultInfo,
  ]);

  return amounts;
}
