import { useCallback, useEffect } from "react";

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
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Token } from "domain/tokens";
import { formatAmountFree } from "lib/numbers";
import { DepositAmounts, WithdrawalAmounts } from "sdk/types/trade";

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
  const glvToken = useSelector(selectPoolsDetailsGlvTokenData);
  const glvTokenAmount = useSelector(selectPoolsDetailsGlvTokenAmount);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
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

  // Deposit: User entered collateral tokens → calculate output market/GLV tokens
  const handleDepositInputUpdate = useCallback(() => {
    if (!amounts || !marketToken) return;

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
      const outputAmount = glvInfo ? amounts.glvTokenAmount : amounts.marketTokenAmount;
      const outputToken = glvInfo ? glvToken : marketToken;
      if (!outputToken) return;

      setMarketOrGlvTokenInputValue(formatTokenAmount(outputAmount, outputToken.decimals));
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
    marketToken,
    focusedInput,
    glvInfo,
    glvToken,
    glvTokenAmount,
    marketTokenAmount,
    firstToken,
    firstTokenWrappedAddress,
    longTokenAddress,
    shortTokenAddress,
    secondToken,
    secondTokenWrappedAddress,
    setMarketOrGlvTokenInputValue,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  ]);

  // Withdrawal: User entered market tokens → calculate output collateral tokens
  const handleWithdrawalInputUpdate = useCallback(() => {
    if (!amounts || !marketInfo || !marketToken) return;

    if (focusedInput === "market") {
      // User entered market token amount → calculate collateral outputs
      if (amounts.marketTokenAmount <= 0n) {
        setFirstTokenInputValue("");
        setSecondTokenInputValue("");
        return;
      }

      if (marketInfo.isSameCollaterals) {
        // Both tokens are the same, combine amounts
        if (longTokenAddress && firstToken) {
          const combinedAmount = amounts.longTokenAmount + amounts.shortTokenAmount;
          setFirstTokenInputValue(formatTokenAmount(combinedAmount, firstToken.decimals));
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
      // User entered collateral amount → calculate market token input
      const isLongFocused = focusedInput === "first";
      const focusedAmount = isLongFocused ? amounts.longTokenAmount : amounts.shortTokenAmount;

      if (focusedAmount <= 0n) {
        // Clear the opposite token and market token
        if (isLongFocused) {
          setSecondTokenInputValue("");
        } else {
          setFirstTokenInputValue("");
        }
        setMarketOrGlvTokenInputValue("");
        return;
      }

      // Update market token input
      setMarketOrGlvTokenInputValue(formatTokenAmount(amounts.marketTokenAmount, marketToken.decimals));

      // Update both collateral token displays
      if (marketInfo.isSameCollaterals) {
        if (longTokenAddress && firstToken) {
          const combinedAmount = amounts.longTokenAmount + amounts.shortTokenAmount;
          setFirstTokenInputValue(formatAmountFree(combinedAmount, firstToken.decimals));
        }
      } else {
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
    }
  }, [
    amounts,
    marketInfo,
    marketToken,
    focusedInput,
    longTokenAddress,
    firstToken,
    firstTokenWrappedAddress,
    shortTokenAddress,
    secondToken,
    secondTokenWrappedAddress,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
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
