import { useCallback, useEffect } from "react";

import {
  PLATFORM_TOKEN_DECIMALS,
  selectPoolsDetailsFirstToken,
  selectPoolsDetailsFlags,
  selectPoolsDetailsFocusedInput,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvTokenAmount,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsSecondToken,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Token } from "domain/tokens";
import { formatAmountFree } from "lib/numbers";
import { DepositAmounts, WithdrawalAmounts } from "sdk/utils/trade/types";

function formatTokenAmount(amount: bigint | undefined, decimals: number): string {
  if (amount === undefined || amount <= 0n) return "";
  return formatAmountFree(amount, decimals);
}

function isTokenMatch(tokenWrappedAddress: string | undefined, targetAddress: string | undefined): boolean {
  return !!tokenWrappedAddress && !!targetAddress && tokenWrappedAddress === targetAddress;
}

function updateTokenInputForMatch({
  token,
  tokenWrappedAddress,
  longTokenAddress,
  shortTokenAddress,
  amounts,
  setInputValue,
}: {
  token: Token | undefined;
  tokenWrappedAddress: string | undefined;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  amounts: DepositAmounts | WithdrawalAmounts;
  setInputValue: (value: string) => void;
}) {
  if (!token) return;

  if (isTokenMatch(tokenWrappedAddress, longTokenAddress)) {
    setInputValue(formatTokenAmount(amounts.longTokenAmount, token.decimals));
  } else if (isTokenMatch(tokenWrappedAddress, shortTokenAddress)) {
    setInputValue(formatTokenAmount(amounts.shortTokenAmount, token.decimals));
  }
}

export function useUpdateInputAmounts() {
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const glvTokenAmount = useSelector(selectPoolsDetailsGlvTokenAmount);
  const marketTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const { isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const firstToken = useSelector(selectPoolsDetailsFirstToken);
  const firstTokenWrappedAddress = firstToken?.wrappedAddress ?? firstToken?.address;
  const secondToken = useSelector(selectPoolsDetailsSecondToken);
  const secondTokenWrappedAddress = secondToken?.wrappedAddress ?? secondToken?.address;
  const focusedInput = useSelector(selectPoolsDetailsFocusedInput);

  const setFirstTokenInputValue = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  const setSecondTokenInputValue = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  const setMarketOrGlvTokenInputValue = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);

  const hasMarketInfo = Boolean(marketInfo);
  const isSameCollaterals = marketInfo?.isSameCollaterals;
  const isGlv = Boolean(glvInfo);

  // Deposit: User entered collateral tokens → calculate output market/GLV tokens
  const handleDepositInputUpdate = useCallback(() => {
    if (!amounts) return;

    const isCollateralFocused = ["first", "second"].includes(focusedInput);

    if (isCollateralFocused) {
      // Check if any input has value
      const hasAnyInput =
        (amounts.longTokenUsd ?? 0) > 0 || (amounts.shortTokenUsd ?? 0) > 0 || (amounts.marketTokenUsd ?? 0) > 0;

      if (!hasAnyInput) {
        setMarketOrGlvTokenInputValue("");
        return;
      }

      // Update market/GLV token output
      const outputAmount = isGlv ? amounts.glvTokenAmount : amounts.marketTokenAmount;

      setMarketOrGlvTokenInputValue(formatTokenAmount(outputAmount, PLATFORM_TOKEN_DECIMALS));
    } else if (focusedInput === "market") {
      // User entered market/GLV amount → calculate collateral inputs
      const inputAmount = glvInfo ? glvTokenAmount : marketTokenAmount;

      if (inputAmount <= 0) {
        setFirstTokenInputValue("");
        setSecondTokenInputValue("");
        return;
      }

      // Special case: platform token deposit
      if (firstToken?.isPlatformToken) {
        setFirstTokenInputValue(formatTokenAmount(amounts.marketTokenAmount, firstToken.decimals));
        return;
      }

      if (isSameCollaterals) {
        if (firstToken) {
          const combinedAmount = amounts.longTokenAmount + amounts.shortTokenAmount;
          setFirstTokenInputValue(formatAmountFree(combinedAmount, firstToken.decimals));
        }
        return;
      }

      // Update collateral token inputs based on their match with long/short tokens
      updateTokenInputForMatch({
        token: firstToken,
        tokenWrappedAddress: firstTokenWrappedAddress,
        longTokenAddress,
        shortTokenAddress,
        amounts,
        setInputValue: setFirstTokenInputValue,
      });

      updateTokenInputForMatch({
        token: secondToken,
        tokenWrappedAddress: secondTokenWrappedAddress,
        longTokenAddress,
        shortTokenAddress,
        amounts,
        setInputValue: setSecondTokenInputValue,
      });
    }
  }, [
    amounts,
    focusedInput,
    isGlv,
    setMarketOrGlvTokenInputValue,
    glvInfo,
    glvTokenAmount,
    marketTokenAmount,
    firstToken,
    isSameCollaterals,
    firstTokenWrappedAddress,
    longTokenAddress,
    shortTokenAddress,
    setFirstTokenInputValue,
    secondToken,
    secondTokenWrappedAddress,
    setSecondTokenInputValue,
  ]);

  // Withdrawal: User entered market tokens → calculate output collateral tokens
  const handleWithdrawalInputUpdate = useCallback(() => {
    if (!amounts || !hasMarketInfo) return;

    if (focusedInput === "market") {
      // User entered market token amount → calculate collateral outputs
      if (amounts.marketTokenAmount <= 0n) {
        setFirstTokenInputValue("");
        setSecondTokenInputValue("");
        return;
      }

      if (isSameCollaterals) {
        // Both tokens are the same, combine amounts
        if (firstToken) {
          const combinedAmount = amounts.longTokenAmount + amounts.shortTokenAmount;

          setFirstTokenInputValue(formatAmountFree(combinedAmount, firstToken.decimals));
        }
      } else {
        // Different tokens, update separately
        updateTokenInputForMatch({
          token: firstToken,
          tokenWrappedAddress: firstTokenWrappedAddress,
          longTokenAddress,
          shortTokenAddress,
          amounts,
          setInputValue: setFirstTokenInputValue,
        });

        updateTokenInputForMatch({
          token: secondToken,
          tokenWrappedAddress: secondTokenWrappedAddress,
          longTokenAddress,
          shortTokenAddress,
          amounts,
          setInputValue: setSecondTokenInputValue,
        });
      }
    } else if (["first", "second"].includes(focusedInput)) {
      const isLongFocused = focusedInput === "first";
      const focusedAmount = isLongFocused ? amounts.longTokenAmount : amounts.shortTokenAmount;

      if (focusedAmount <= 0n) {
        if (isLongFocused) {
          setSecondTokenInputValue("");
        } else {
          setFirstTokenInputValue("");
        }
        setMarketOrGlvTokenInputValue("");
        return;
      }

      setMarketOrGlvTokenInputValue(formatTokenAmount(amounts.marketTokenAmount, PLATFORM_TOKEN_DECIMALS));

      if (!isSameCollaterals) {
        if (isLongFocused) {
          updateTokenInputForMatch({
            token: secondToken,
            tokenWrappedAddress: secondTokenWrappedAddress,
            longTokenAddress,
            shortTokenAddress,
            amounts,
            setInputValue: setSecondTokenInputValue,
          });
        } else {
          updateTokenInputForMatch({
            token: firstToken,
            tokenWrappedAddress: firstTokenWrappedAddress,
            longTokenAddress,
            shortTokenAddress,
            amounts,
            setInputValue: setFirstTokenInputValue,
          });
        }
      }
    }
  }, [
    amounts,
    hasMarketInfo,
    focusedInput,
    isSameCollaterals,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
    longTokenAddress,
    firstToken,
    firstTokenWrappedAddress,
    shortTokenAddress,
    secondToken,
    secondTokenWrappedAddress,
    setMarketOrGlvTokenInputValue,
  ]);

  useEffect(
    function updateInputAmounts() {
      if (isDeposit) {
        handleDepositInputUpdate();
      } else if (isWithdrawal) {
        handleWithdrawalInputUpdate();
      }
    },
    [handleDepositInputUpdate, handleWithdrawalInputUpdate, isDeposit, isWithdrawal]
  );
}
