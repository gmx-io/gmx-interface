import { Dispatch, SetStateAction, useEffect } from "react";

import { GlvInfo, MarketInfo } from "domain/synthetics/markets/types";
import { TokenData } from "domain/synthetics/tokens";
import type { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade";
import { formatAmountFree } from "lib/numbers";
import { TokenInputState } from "./types";

export function useUpdateInputAmounts({
  marketToken,
  marketInfo,
  longTokenInputState,
  shortTokenInputState,
  fromMarketTokenInputState,
  isDeposit,
  focusedInput,
  amounts,
  glvInfo,
  glvToken,
  setMarketOrGlvTokenInputValue,
  marketTokenAmount,
  glvTokenAmount,
  isWithdrawal,
  setFirstTokenInputValue,
  setSecondTokenInputValue,
}: {
  marketToken: TokenData | undefined;
  glvToken: TokenData | undefined;
  marketInfo: MarketInfo | undefined;
  glvInfo: GlvInfo | undefined;
  longTokenInputState: TokenInputState | undefined;
  shortTokenInputState: TokenInputState | undefined;
  fromMarketTokenInputState: TokenInputState | undefined;
  isDeposit: boolean;
  focusedInput: string;
  amounts: DepositAmounts | WithdrawalAmounts | undefined;
  setMarketOrGlvTokenInputValue: Dispatch<SetStateAction<string>>;
  marketTokenAmount: bigint;
  glvTokenAmount: bigint;
  isWithdrawal: boolean;
  setFirstTokenInputValue: Dispatch<SetStateAction<string>>;
  setSecondTokenInputValue: Dispatch<SetStateAction<string>>;
}) {
  useEffect(
    function updateInputAmounts() {
      if (!marketToken || !marketInfo) {
        return;
      }

      const longToken = longTokenInputState?.token;
      const shortToken = shortTokenInputState?.token;
      const fromMarketToken = fromMarketTokenInputState?.token;

      if (isDeposit) {
        if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if (
            (amounts?.longTokenUsd ?? 0) <= 0 &&
            (amounts?.shortTokenUsd ?? 0) <= 0 &&
            (amounts?.marketTokenUsd ?? 0) <= 0
          ) {
            setMarketOrGlvTokenInputValue("");
            return;
          }

          if (amounts) {
            const setAmount = glvInfo ? amounts.glvTokenAmount : amounts.marketTokenAmount;
            const setToken = glvInfo ? glvToken! : marketToken;
            setMarketOrGlvTokenInputValue(setAmount > 0n ? formatAmountFree(setAmount, setToken.decimals) : "");
          }
        } else if (focusedInput === "market") {
          if (glvInfo ? glvTokenAmount <= 0n : marketTokenAmount <= 0n) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            fromMarketTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (longToken) {
              let longTokenAmountToSet = amounts.longTokenAmount;

              longTokenInputState?.setValue(
                longTokenAmountToSet > 0n ? formatAmountFree(longTokenAmountToSet, longToken.decimals) : ""
              );
            }

            if (shortToken) {
              shortTokenInputState?.setValue(
                amounts.shortTokenAmount > 0n ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
              );
            }

            if (fromMarketToken) {
              fromMarketTokenInputState?.setValue(
                amounts.marketTokenAmount > 0n ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
              );
            }
            return;
          }
        }

        return;
      }

      if (isWithdrawal) {
        if (focusedInput === "market") {
          if ((amounts?.marketTokenAmount ?? 0) <= 0) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (marketInfo.isSameCollaterals) {
              if (longToken) {
                setFirstTokenInputValue(
                  amounts.longTokenAmount > 0n
                    ? formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, longToken.decimals)
                    : ""
                );
              }
            } else {
              if (longToken) {
                longTokenInputState?.setValue(
                  amounts.longTokenAmount > 0n ? formatAmountFree(amounts.longTokenAmount, longToken.decimals) : ""
                );
              }
              if (shortToken) {
                shortTokenInputState?.setValue(
                  amounts.shortTokenAmount > 0n ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
                );
              }
            }
          }
        } else if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if (focusedInput === "longCollateral" && (amounts?.longTokenAmount ?? 0) <= 0) {
            shortTokenInputState?.setValue("");
            setMarketOrGlvTokenInputValue("");
            return;
          }

          if (focusedInput === "shortCollateral" && (amounts?.shortTokenAmount ?? 0) <= 0) {
            longTokenInputState?.setValue("");
            setMarketOrGlvTokenInputValue("");
            return;
          }

          if (amounts) {
            setMarketOrGlvTokenInputValue(
              amounts.marketTokenAmount > 0n ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
            );
            if (marketInfo.isSameCollaterals) {
              if (longToken) {
                longTokenInputState?.setValue(
                  formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, longToken.decimals)
                );
              }
            } else {
              if (longToken) {
                longTokenInputState?.setValue(formatAmountFree(amounts.longTokenAmount, longToken.decimals));
              }
              if (shortToken) {
                shortTokenInputState?.setValue(formatAmountFree(amounts.shortTokenAmount, shortToken.decimals));
              }
            }
          }
        }
      }
    },
    [
      amounts,
      focusedInput,
      isDeposit,
      isWithdrawal,
      longTokenInputState,
      marketInfo,
      marketToken,
      marketTokenAmount,
      setFirstTokenInputValue,
      setMarketOrGlvTokenInputValue,
      setSecondTokenInputValue,
      shortTokenInputState,
      fromMarketTokenInputState,
      glvInfo,
      glvToken,
      glvTokenAmount,
    ]
  );
}
