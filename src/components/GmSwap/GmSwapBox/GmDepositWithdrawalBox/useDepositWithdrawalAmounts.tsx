import { useMemo } from "react";

import { ContractsChainId } from "config/chains";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo, MarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { convertTokenAddress } from "sdk/configs/tokens";
import { DepositAmounts, WithdrawalAmounts } from "sdk/types/trade";

import { TokenInputState } from "./types";

export function useDepositWithdrawalAmounts({
  chainId,
  isDeposit,
  isPair,
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
  chainId: ContractsChainId;
  isDeposit: boolean;
  isPair: boolean;
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

  const hasLongTokenInputState = longTokenInputState !== undefined;

  const receiveTokenAddress =
    !isDeposit && !isPair ? longTokenInputState?.address ?? shortTokenInputState?.address : undefined;
  const wrappedReceiveTokenAddress = receiveTokenAddress
    ? convertTokenAddress(chainId, receiveTokenAddress, "wrapped")
    : undefined;

  const selectFindSwap = useMemo(() => {
    if (!hasLongTokenInputState) {
      // long to short swap
      return makeSelectFindSwapPath(marketInfo?.longToken.address, marketInfo?.shortToken.address);
    }

    return makeSelectFindSwapPath(marketInfo?.shortToken.address, marketInfo?.longToken.address);
  }, [hasLongTokenInputState, marketInfo?.longToken.address, marketInfo?.shortToken.address]);
  const findSwapPath = useSelector(selectFindSwap);

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
      const shortTokenAmount =
        (marketInfo.isSameCollaterals
          ? longTokenInputState?.amount !== undefined
            ? longTokenInputState?.amount - longTokenAmount
            : 0n
          : shortTokenInputState?.amount) ?? 0n;

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
        findSwapPath,
        wrappedReceiveTokenAddress,
      });
    }
  }, [
    isDeposit,
    isWithdrawal,
    marketInfo,
    marketToken,
    marketTokensData,
    glvInfo,
    marketTokenAmount,
    glvTokenAmount,
    longTokenInputState?.address,
    longTokenInputState?.amount,
    shortTokenInputState?.address,
    shortTokenInputState?.amount,
    uiFeeFactor,
    focusedInput,
    isMarketTokenDeposit,
    glvToken,
    halfOfLong,
    findSwapPath,
    wrappedReceiveTokenAddress,
  ]);

  return amounts;
}
