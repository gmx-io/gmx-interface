import { useMemo } from "react";

import { MarketInfo } from "domain/synthetics/markets/types";
import { TokenData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade/types";

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
}: {
  isDeposit: boolean;
  isWithdrawal: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longTokenInputState:
    | {
        address: string;
        amount?: bigint | undefined;
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
}): DepositAmounts | WithdrawalAmounts | undefined {
  const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;

  const amounts = useMemo(() => {
    if (isDeposit) {
      if (!marketInfo || !marketToken) {
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
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        includeLongToken: Boolean(longTokenInputState?.address),
        includeShortToken: Boolean(shortTokenInputState?.address),
        uiFeeFactor,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
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
      });
    }
  }, [
    focusedInput,
    halfOfLong,
    isDeposit,
    isWithdrawal,
    longTokenInputState?.address,
    longTokenInputState?.amount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    shortTokenInputState?.address,
    shortTokenInputState?.amount,
    uiFeeFactor,
  ]);

  return amounts;
}
