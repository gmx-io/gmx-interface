import { useEffect } from "react";

import {
  selectPoolsDetailsFirstToken,
  selectPoolsDetailsFlags,
  selectPoolsDetailsFocusedInput,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvTokenAmount,
  selectPoolsDetailsGlvTokenData,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsSecondToken,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatAmountFree } from "lib/numbers";

import { selectDepositWithdrawalAmounts } from "./selectDepositWithdrawalAmounts";

export function useUpdateInputAmounts() {
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const glvToken = useSelector(selectPoolsDetailsGlvTokenData);
  const glvTokenAmount = useSelector(selectPoolsDetailsGlvTokenAmount);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const marketTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const longToken = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortToken = useSelector(selectPoolsDetailsShortTokenAddress);
  const { isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const amounts = useSelector(selectDepositWithdrawalAmounts);
  const firstToken = useSelector(selectPoolsDetailsFirstToken);
  const secondToken = useSelector(selectPoolsDetailsSecondToken);
  const focusedInput = useSelector(selectPoolsDetailsFocusedInput);

  const setFirstTokenInputValue = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  const setSecondTokenInputValue = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  const setMarketOrGlvTokenInputValue = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);

  useEffect(
    function updateInputAmounts() {
      if (!marketToken || !marketInfo) {
        return;
      }

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
            // longTokenInputState?.setValue("");
            // shortTokenInputState?.setValue("");
            // fromMarketTokenInputState?.setValue("");
            setFirstTokenInputValue("");
            setSecondTokenInputValue("");
            return;
          }

          if (amounts) {
            if (longToken && firstToken) {
              let longTokenAmountToSet = amounts.longTokenAmount;

              // longTokenInputState?.setValue(
              //   longTokenAmountToSet > 0 ? formatAmountFree(longTokenAmountToSet, longToken.decimals) : ""
              // );
              setFirstTokenInputValue(
                longTokenAmountToSet > 0 ? formatAmountFree(longTokenAmountToSet, firstToken.decimals) : ""
              );
            }

            if (shortToken && secondToken) {
              // shortTokenInputState?.setValue(
              //   amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
              // );
              setSecondTokenInputValue(
                amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, secondToken.decimals) : ""
              );
            }

            if (fromMarketToken && firstToken) {
              // fromMarketTokenInputState?.setValue(
              //   amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
              // );
              setFirstTokenInputValue(
                amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, firstToken.decimals) : ""
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
            // longTokenInputState?.setValue("");
            setFirstTokenInputValue("");
            // shortTokenInputState?.setValue("");
            setSecondTokenInputValue("");
            return;
          }

          if (amounts) {
            if (marketInfo.isSameCollaterals) {
              if (longToken && firstToken) {
                setFirstTokenInputValue(
                  amounts.longTokenAmount > 0
                    ? formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, firstToken.decimals)
                    : ""
                );
              }
            } else {
              if (longToken && firstToken) {
                // longTokenInputState?.setValue(
                //   amounts.longTokenAmount > 0 ? formatAmountFree(amounts.longTokenAmount, longToken.decimals) : ""
                // );
                setFirstTokenInputValue(
                  amounts.longTokenAmount > 0 ? formatAmountFree(amounts.longTokenAmount, firstToken.decimals) : ""
                );
              }
              if (shortToken && secondToken) {
                // shortTokenInputState?.setValue(
                //   amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
                // );
                setSecondTokenInputValue(
                  amounts.shortTokenAmount > 0 ? formatAmountFree(amounts.shortTokenAmount, secondToken.decimals) : ""
                );
              }
            }
          }
        } else if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if (focusedInput === "longCollateral" && (amounts?.longTokenAmount ?? 0) <= 0) {
            // shortTokenInputState?.setValue("");
            setSecondTokenInputValue("");
            setMarketOrGlvTokenInputValue("");
            return;
          }

          if (focusedInput === "shortCollateral" && (amounts?.shortTokenAmount ?? 0) <= 0) {
            // longTokenInputState?.setValue("");
            setFirstTokenInputValue("");
            setMarketOrGlvTokenInputValue("");
            return;
          }

          if (amounts) {
            setMarketOrGlvTokenInputValue(
              amounts.marketTokenAmount > 0 ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
            );
            if (marketInfo.isSameCollaterals) {
              if (longToken && firstToken) {
                // longTokenInputState?.setValue(
                //   formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, longToken.decimals)
                // );
                setFirstTokenInputValue(
                  formatAmountFree(amounts.longTokenAmount + amounts.shortTokenAmount, firstToken.decimals)
                );
              }
            } else {
              if (longToken && firstToken) {
                // longTokenInputState?.setValue(formatAmountFree(amounts.longTokenAmount, longToken.decimals));
                setFirstTokenInputValue(formatAmountFree(amounts.longTokenAmount, firstToken.decimals));
              }
              if (shortToken && secondToken) {
                // shortTokenInputState?.setValue(formatAmountFree(amounts.shortTokenAmount, shortToken.decimals));
                setSecondTokenInputValue(formatAmountFree(amounts.shortTokenAmount, secondToken.decimals));
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
      marketInfo,
      marketToken,
      marketTokenAmount,
      setFirstTokenInputValue,
      setMarketOrGlvTokenInputValue,
      setSecondTokenInputValue,
      glvInfo,
      glvToken,
      glvTokenAmount,
      longToken,
      firstToken,
      shortToken,
      secondToken,
    ]
  );
}
