import { Dispatch, SetStateAction, useEffect } from "react";

import { isGlv } from "domain/synthetics/markets/glv";
import { MarketInfo } from "domain/synthetics/markets/types";
import { convertToTokenAmount, convertToUsd, TokenData } from "domain/synthetics/tokens";
import type { DepositAmounts, WithdrawalAmounts } from "domain/synthetics/trade";
import { formatAmountFree } from "lib/numbers";

export function useUpdateInputAmounts({
  marketToken,
  marketInfo,
  longTokenInputState,
  shortTokenInputState,
  isDeposit,
  focusedInput,
  amounts,
  setMarketTokenInputValue,
  marketTokenAmount,
  isWithdrawal,
  setFirstTokenInputValue,
  setSecondTokenInputValue,
}: {
  marketToken: TokenData | undefined;
  marketInfo: MarketInfo | undefined;
  longTokenInputState:
    | {
        address: string;
        value: string;
        amount?: bigint | undefined;
        usd?: bigint | undefined;
        token?: TokenData | undefined;
        setValue: (val: string) => void;
        isGm?: boolean;
      }
    | undefined;
  shortTokenInputState:
    | {
        address: string;
        value: string;
        amount?: bigint | undefined;
        usd?: bigint | undefined;
        token?: TokenData | undefined;
        setValue: (val: string) => void;
      }
    | undefined;
  isDeposit: boolean;
  focusedInput: string;
  amounts: DepositAmounts | WithdrawalAmounts | undefined;
  setMarketTokenInputValue: Dispatch<SetStateAction<string>>;
  marketTokenAmount: bigint;
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

      if (isDeposit) {
        if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if ((amounts?.longTokenUsd ?? 0) <= 0 && (amounts?.shortTokenUsd ?? 0) <= 0) {
            setMarketTokenInputValue("");
            return;
          }

          if (amounts) {
            if (isGlv(marketInfo)) {
              const glvPrice = marketInfo.indexToken.prices.maxPrice;
              let gmUsdAmount: undefined | bigint = 0n;

              if (longTokenInputState?.isGm) {
                gmUsdAmount = convertToUsd(
                  amounts.longTokenAmount,
                  longTokenInputState.token?.decimals,
                  longTokenInputState.token?.prices.minPrice
                );
              } else {
                gmUsdAmount = amounts.marketTokenUsd;
              }

              const glvAmount = convertToTokenAmount(gmUsdAmount, marketInfo.indexToken.decimals, glvPrice);

              setMarketTokenInputValue(
                glvAmount !== undefined && glvAmount > 0
                  ? formatAmountFree(glvAmount, marketInfo.indexToken.decimals)
                  : ""
              );
            } else {
              setMarketTokenInputValue(
                amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
              );
            }
          }
        } else if (focusedInput === "market") {
          if (marketTokenAmount <= 0) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (longToken) {
              let longTokenAmountToSet = amounts.longTokenAmount;

              if (isGlv(marketInfo)) {
                amounts.longTokenUsd;
                // @todo
              }

              longTokenInputState?.setValue(
                longTokenAmountToSet > 0 ? formatAmountFree(longTokenAmountToSet, longToken.decimals) : ""
              );
            }

            if (shortToken) {
              shortTokenInputState?.setValue(
                amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
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
            setMarketTokenInputValue("");
            return;
          }

          if (focusedInput === "shortCollateral" && (amounts?.shortTokenAmount ?? 0) <= 0) {
            longTokenInputState?.setValue("");
            setMarketTokenInputValue("");
            return;
          }

          if (amounts) {
            setMarketTokenInputValue(
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
      setMarketTokenInputValue,
      setSecondTokenInputValue,
      shortTokenInputState,
    ]
  );
}
