import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import { getUsdgConversionTokenAddress } from "config/usdgPools";
import {
  getIsPositionInfoLoaded,
  getMinCollateralFactorForPosition,
  parsePositionKey,
} from "domain/synthetics/positions";
import { convertToUsd, getBalanceByBalanceType } from "domain/synthetics/tokens";
import { Operation } from "domain/synthetics/trade/usePositionEditorState";
import {
  getIsSwapPathFillable,
  getMaxInstantSwapAmount,
  getShouldDefaultToUsdc,
} from "domain/synthetics/usdgPools/usdcConversion";
import { parseValue } from "lib/numbers";
import { getSwapAmountsByFromValue } from "sdk/utils/swap/swapValues";
import { TokenBalanceType } from "sdk/utils/tokens/types";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectChainId,
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
} from "./globalSelectors";
import { makeSelectFindSwapPath } from "./tradeSelectors";

export const selectPositionEditorEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.editingPositionKey;
export const selectPositionEditorSetEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.setEditingPositionKey;

export const selectPositionEditorPosition = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);
  if (!positionKey) return undefined;
  return q((s) => selectPositionsInfoData(s)?.[positionKey]);
});

export const selectPositionEditorMinCollateralFactor = createSelector((q) => {
  const position = q(selectPositionEditorPosition);

  if (!getIsPositionInfoLoaded(position)) return undefined;

  return getMinCollateralFactorForPosition(position, 0n);
});

export const selectPositionEditorCollateralInputValue = (state: SyntheticsState) =>
  state.positionEditor.collateralInputValue;
export const selectPositionEditorSetCollateralInputValue = (state: SyntheticsState) =>
  state.positionEditor.setCollateralInputValue;

const selectPositionEditorSelectedCollateralAddressMap = (state: SyntheticsState) =>
  state.positionEditor.selectedCollateralAddressMap;
export const selectPositionEditorSetSelectedCollateralAddress = (state: SyntheticsState) =>
  state.positionEditor.setSelectedCollateralAddress;

export const selectPositionEditorIsCollateralTokenFromGmxAccount = (state: SyntheticsState) =>
  state.positionEditor.isCollateralTokenFromGmxAccount;
export const selectPositionEditorSetIsCollateralTokenFromGmxAccount = (state: SyntheticsState) =>
  state.positionEditor.setIsCollateralTokenFromGmxAccount;

export const selectPositionEditorDepositPayTokenAddress = (state: SyntheticsState) =>
  state.positionEditor.depositPayTokenAddress;
export const selectPositionEditorSetDepositPayTokenAddress = (state: SyntheticsState) =>
  state.positionEditor.setDepositPayTokenAddress;

// "at price" deposits are limit orders, and a failed swap would freeze them, so only "now" deposits convert
export const selectPositionEditorDepositConversionTokenAddress = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);

  if (
    !positionKey ||
    q(selectPositionEditorOperation) !== Operation.Deposit ||
    q(selectPositionEditorDepositMode) !== "now"
  ) {
    return undefined;
  }

  return getUsdgConversionTokenAddress(q(selectChainId), parsePositionKey(positionKey).collateralAddress) as
    | Address
    | undefined;
});

export const selectPositionEditorSelectedCollateralAddress = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);

  if (!positionKey) {
    return;
  }

  const positionCollateralAddress = parsePositionKey(positionKey).collateralAddress as Address;

  const conversionTokenAddress = q(selectPositionEditorDepositConversionTokenAddress);

  if (conversionTokenAddress) {
    const depositPayTokenAddress = q(selectPositionEditorDepositPayTokenAddress);

    if (depositPayTokenAddress) {
      return depositPayTokenAddress;
    }

    const balanceType = q(selectPositionEditorIsCollateralTokenFromGmxAccount)
      ? TokenBalanceType.GmxAccount
      : TokenBalanceType.Wallet;
    const shouldDefaultToUsdc = getShouldDefaultToUsdc({
      usdgBalance: getBalanceByBalanceType(
        q((s) => selectTokensData(s)?.[positionCollateralAddress]),
        balanceType
      ),
      usdcBalance: getBalanceByBalanceType(
        q((s) => selectTokensData(s)?.[conversionTokenAddress]),
        balanceType
      ),
    });

    return shouldDefaultToUsdc ? conversionTokenAddress : positionCollateralAddress;
  }

  const savedAddress = q((s) => selectPositionEditorSelectedCollateralAddressMap(s)?.[positionCollateralAddress]);

  if (!savedAddress) {
    return positionCollateralAddress;
  }

  return savedAddress;
});

export const selectPositionEditorSelectedCollateralToken = createSelector((q) => {
  const tokenAddress = q(selectPositionEditorSelectedCollateralAddress);
  const isCollateralTokenFromGmxAccount = q(selectPositionEditorIsCollateralTokenFromGmxAccount);

  if (!tokenAddress) return;

  const token = q((s) => selectTokensData(s)?.[tokenAddress]);

  if (!token) {
    return;
  }

  if (isCollateralTokenFromGmxAccount) {
    return { ...token, balanceType: TokenBalanceType.GmxAccount, balance: token.gmxAccountBalance };
  }

  return { ...token, balanceType: TokenBalanceType.Wallet, balance: token.walletBalance };
});

export const selectPositionEditorOperation = (state: SyntheticsState) => state.positionEditor.operation;
export const selectPositionEditorSetOperation = (state: SyntheticsState) => state.positionEditor.setOperation;

export const selectPositionEditorDepositMode = (state: SyntheticsState) => state.positionEditor.depositMode;
export const selectPositionEditorSetDepositMode = (state: SyntheticsState) => state.positionEditor.setDepositMode;

export const selectPositionEditorTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionEditor.triggerPriceInputValue;
export const selectPositionEditorSetTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionEditor.setTriggerPriceInputValue;

export const selectPositionEditorReplacingOrderKey = (state: SyntheticsState) => state.positionEditor.replacingOrderKey;
export const selectPositionEditorSetReplacingOrderKey = (state: SyntheticsState) =>
  state.positionEditor.setReplacingOrderKey;

export const selectPositionEditorAtPriceOpenRequest = (state: SyntheticsState) =>
  state.positionEditor.atPriceOpenRequest;
export const selectPositionEditorClearAtPriceOpenRequest = (state: SyntheticsState) =>
  state.positionEditor.clearAtPriceOpenRequest;

export const selectPositionEditorOpenAtPrice = (state: SyntheticsState) => state.positionEditor.openAtPrice;

export const selectPositionEditorOpenDepositNow = (state: SyntheticsState) => state.positionEditor.openDepositNow;

export const selectPositionEditorAddMarginReturnPositionKey = (state: SyntheticsState) =>
  state.positionEditor.addMarginReturnPositionKey;
export const selectPositionEditorSetAddMarginReturnPositionKey = (state: SyntheticsState) =>
  state.positionEditor.setAddMarginReturnPositionKey;

export const selectPositionEditorTriggerPrice = createSelector((q) => {
  const triggerPriceInputValue = q(selectPositionEditorTriggerPriceInputValue);
  const indexToken = q(selectPositionEditorPosition)?.indexToken;

  if (!triggerPriceInputValue || !indexToken) return undefined;

  let triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  if (triggerPrice === 0n) {
    triggerPrice = undefined;
  } else if (triggerPrice !== undefined && indexToken.visualMultiplier) {
    triggerPrice = triggerPrice / BigInt(indexToken.visualMultiplier);
  }

  return triggerPrice;
});

export const selectPositionEditorReplacingOrder = createSelector((q) => {
  const replacingOrderKey = q(selectPositionEditorReplacingOrderKey);

  if (!replacingOrderKey) return undefined;

  return q((s) => selectOrdersInfoData(s)?.[replacingOrderKey]);
});

export const selectPositionEditorCollateralInputAmountAndUsd = createSelector((q) => {
  const collateralInputValue = q(selectPositionEditorCollateralInputValue);
  const collateralToken = q(selectPositionEditorSelectedCollateralToken);

  const collateralPrice = collateralToken?.prices.minPrice;
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  return {
    collateralDeltaAmount,
    collateralDeltaUsd,
  };
});

const selectPositionEditorDepositSwapFindSwapPath = createSelector((q) => {
  const position = q(selectPositionEditorPosition);
  const payToken = q(selectPositionEditorSelectedCollateralToken);
  const conversionTokenAddress = q(selectPositionEditorDepositConversionTokenAddress);

  if (!position || !payToken || conversionTokenAddress === undefined || payToken.address !== conversionTokenAddress) {
    return undefined;
  }

  return q(makeSelectFindSwapPath(payToken.address, position.collateralTokenAddress));
});

export const selectPositionEditorDepositSwapAmounts = createSelector((q) => {
  const position = q(selectPositionEditorPosition);
  const payToken = q(selectPositionEditorSelectedCollateralToken);
  const findSwapPath = q(selectPositionEditorDepositSwapFindSwapPath);
  const { collateralDeltaAmount } = q(selectPositionEditorCollateralInputAmountAndUsd);

  if (!position || !payToken || !findSwapPath || collateralDeltaAmount === undefined) {
    return undefined;
  }

  return getSwapAmountsByFromValue({
    tokenIn: payToken,
    tokenOut: position.collateralToken,
    amountIn: collateralDeltaAmount,
    isLimit: false,
    uiFeeFactor: q(selectUiFeeFactor),
    marketsInfoData: q(selectMarketsInfoData),
    chainId: q(selectChainId),
    externalSwapQuoteParams: undefined,
    findSwapPath,
    allowSameTokenSwap: false,
  });
});

export const selectPositionEditorIsDepositSwapUnfillable = createSelector((q) => {
  const swapAmounts = q(selectPositionEditorDepositSwapAmounts);

  // without market data the route finder returns nothing, which isn't the same as the pool being short
  return (
    q(selectMarketsInfoData) !== undefined &&
    swapAmounts !== undefined &&
    swapAmounts.amountIn > 0n &&
    !getIsSwapPathFillable(swapAmounts.swapStrategy.swapPathStats)
  );
});

export const selectPositionEditorDepositMaxInstantAmount = createSelector((q) => {
  if (!q(selectPositionEditorIsDepositSwapUnfillable)) {
    return undefined;
  }

  const payToken = q(selectPositionEditorSelectedCollateralToken);
  const findSwapPath = q(selectPositionEditorDepositSwapFindSwapPath);
  const { collateralDeltaAmount } = q(selectPositionEditorCollateralInputAmountAndUsd);

  if (!payToken || !findSwapPath || collateralDeltaAmount === undefined) {
    return undefined;
  }

  return getMaxInstantSwapAmount({ tokenIn: payToken, maxAmountIn: collateralDeltaAmount, findSwapPath });
});
