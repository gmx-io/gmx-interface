import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import {
  getIsPositionInfoLoaded,
  getMinCollateralFactorForPosition,
  parsePositionKey,
} from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import { parseValue } from "lib/numbers";
import { TokenBalanceType } from "sdk/utils/tokens/types";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import { selectOrdersInfoData, selectPositionsInfoData, selectTokensData } from "./globalSelectors";

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

export const selectPositionEditorSelectedCollateralAddress = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);

  if (!positionKey) {
    return;
  }

  const positionCollateralAddress = parsePositionKey(positionKey).collateralAddress as Address;

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
