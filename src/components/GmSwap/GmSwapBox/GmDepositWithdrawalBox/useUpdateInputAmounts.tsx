import { useEffect } from "react";

import { GlvInfo, MarketInfo } from "domain/synthetics/markets/types";
import { TokenData } from "domain/synthetics/tokens";
import type { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade";
import { formatAmountFree } from "lib/numbers";
import { ContractsChainId } from "sdk/configs/chains";
import { getToken } from "sdk/configs/tokens";

import { TokenInputState } from "./types";

export function useUpdateInputAmounts({
  chainId,
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
  chainId: ContractsChainId;
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
  setMarketOrGlvTokenInputValue: (value: string) => void;
  marketTokenAmount: bigint;
  glvTokenAmount: bigint;
  isWithdrawal: boolean;
  setFirstTokenInputValue: (value: string) => void;
  setSecondTokenInputValue: (value: string) => void;
}) {
  useEffect(
    function updateInputAmounts() {
      if (!marketToken || !marketInfo) {
        return;
      }

      const longToken = longTokenInputState ? getToken(chainId, longTokenInputState.address) : undefined;
      const shortToken = shortTokenInputState ? getToken(chainId, shortTokenInputState.address) : undefined;
      const fromMarketToken = marketToken;

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
            setMarketOrGlvTokenInputValue(setAmount > 0 ? formatAmountFree(setAmount, setToken.decimals) : "");
          }
        } else if (focusedInput === "market") {
          if (glvInfo ? glvTokenAmount <= 0 : marketTokenAmount <= 0) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            fromMarketTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (longToken) {
              let longTokenAmountToSet = amounts.longTokenAmount;

              longTokenInputState?.setValue(
                longTokenAmountToSet > 0 ? formatAmountFree(longTokenAmountToSet, longToken.decimals) : ""
              );
            }

            if (shortToken) {
              shortTokenInputState?.setValue(
                amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
              );
            }

            if (fromMarketToken) {
              fromMarketTokenInputState?.setValue(
                amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
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
                  amounts.longTokenAmount > 0
                    ? formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, longToken.decimals)
                    : ""
                );
              }
            } else {
              if (longToken) {
                longTokenInputState?.setValue(
                  amounts.longTokenAmount > 0 ? formatAmountFree(amounts.longTokenAmount, longToken.decimals) : ""
                );
              }
              if (shortToken) {
                shortTokenInputState?.setValue(
                  amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
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
              amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
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
      chainId,
    ]
  );
}
