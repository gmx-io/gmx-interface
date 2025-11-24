import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsFocusedInput,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsLongTokenAmount,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsShortTokenAmount,
  selectPoolsDetailsWithdrawalFindSwapPath,
  selectPoolsDetailsWithdrawalReceiveTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectChainId, selectUiFeeFactor } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { convertTokenAddress } from "sdk/configs/tokens";
import { DepositAmounts, WithdrawalAmounts } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

export const selectDepositWithdrawalAmounts = createSelector((q): DepositAmounts | WithdrawalAmounts | undefined => {
  const chainId = q(selectChainId);
  const uiFeeFactor = q(selectUiFeeFactor);

  const { isDeposit, isWithdrawal } = q(selectPoolsDetailsFlags);
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  const glvToken = glvInfo?.glvToken;
  const marketInfo = q(selectPoolsDetailsMarketInfo);
  const marketTokensData = q(selectPoolsDetailsMarketTokensData);
  const marketToken = q(selectPoolsDetailsMarketTokenData);
  const focusedInput = q(selectPoolsDetailsFocusedInput);

  const marketOrGlvTokenAmount = q(selectPoolsDetailsMarketOrGlvTokenAmount);

  const { isPair } = q(selectPoolsDetailsFlags);
  const longTokenAmount = q(selectPoolsDetailsLongTokenAmount);
  const shortTokenAmount = q(selectPoolsDetailsShortTokenAmount);
  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const firstTokenAmount = q(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = q(selectPoolsDetailsSecondTokenAmount);
  const isMarketTokenDeposit = q(selectPoolsDetailsIsMarketTokenDeposit);

  const receiveTokenAddress = q(selectPoolsDetailsWithdrawalReceiveTokenAddress);
  const withdrawalFindSwapPath = q(selectPoolsDetailsWithdrawalFindSwapPath);

  if (!marketInfo || !marketToken || !marketTokensData) {
    return undefined;
  }

  let marketTokenAmount = 0n;
  if (isDeposit && isMarketTokenDeposit) {
    if (firstTokenAddress !== undefined && firstTokenAddress === marketInfo.marketTokenAddress) {
      marketTokenAmount += firstTokenAmount;
    }
    if (secondTokenAddress !== undefined && secondTokenAddress === marketInfo.marketTokenAddress) {
      marketTokenAmount += secondTokenAmount;
    }
  } else {
    marketTokenAmount = marketOrGlvTokenAmount;
  }

  let glvTokenAmount = 0n;
  if (glvInfo) {
    glvTokenAmount = marketOrGlvTokenAmount;
  }

  if (isDeposit) {
    // adjust for same collateral
    if (marketInfo.isSameCollaterals) {
      const positiveAmount = bigMath.max(longTokenAmount, shortTokenAmount);

      const adjustedLongTokenAmount = positiveAmount / 2n;
      const adjustedShortTokenAmount = positiveAmount - adjustedLongTokenAmount;

      return getDepositAmounts({
        marketInfo,
        marketToken,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount: adjustedLongTokenAmount,
        shortTokenAmount: adjustedShortTokenAmount,
        marketTokenAmount,
        glvTokenAmount,
        includeLongToken: adjustedLongTokenAmount > 0n,
        includeShortToken: adjustedShortTokenAmount > 0n,
        uiFeeFactor,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
        isMarketTokenDeposit,
        glvInfo,
        glvToken: glvToken!,
      });
    }

    const includeLongToken = isPair
      ? true
      : firstTokenAddress !== undefined &&
        (firstTokenAddress === longTokenAddress ||
          convertTokenAddress(chainId, firstTokenAddress, "wrapped") === longTokenAddress);
    const includeShortToken = isPair
      ? true
      : firstTokenAddress !== undefined &&
        (firstTokenAddress === shortTokenAddress ||
          convertTokenAddress(chainId, firstTokenAddress, "wrapped") === shortTokenAddress);

    return getDepositAmounts({
      marketInfo,
      marketToken,
      longToken: marketInfo.longToken,
      shortToken: marketInfo.shortToken,
      longTokenAmount,
      shortTokenAmount,
      marketTokenAmount,
      glvTokenAmount,
      includeLongToken,
      includeShortToken,
      uiFeeFactor,
      strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
      isMarketTokenDeposit,
      glvInfo,
      glvToken: glvToken!,
    });
  } else if (isWithdrawal) {
    let strategy: "byMarketToken" | "byLongCollateral" | "byShortCollateral" | "byCollaterals" = "byMarketToken";
    if (focusedInput === "market") {
      strategy = "byMarketToken";
    } else if (focusedInput === "first") {
      strategy = "byLongCollateral";
    } else {
      strategy = "byShortCollateral";
    }

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
      findSwapPath: withdrawalFindSwapPath,
      wrappedReceiveTokenAddress: receiveTokenAddress,
    });
  }

  return undefined;
});
