import { createSelectionContext } from "@taskworld.com/rereselect";

import { getToken } from "sdk/configs/tokens";
import { parseValue } from "sdk/utils/numbers";

import type { GmxAccountContext } from "./GmxAccountContext";

//#region Pure selectors

export const selectGmxAccountModalOpen = (s: GmxAccountContext) => s.modalOpen;
export const selectGmxAccountSetModalOpen = (s: GmxAccountContext) => s.setModalOpen;

export const selectGmxAccountSettlementChainId = (s: GmxAccountContext) => s.settlementChainId;
export const selectGmxAccountSetSettlementChainId = (s: GmxAccountContext) => s.setSettlementChainId;

export const selectGmxAccountDepositViewChain = (s: GmxAccountContext) => s.depositViewChain;
export const selectGmxAccountSetDepositViewChain = (s: GmxAccountContext) => s.setDepositViewChain;
export const selectGmxAccountDepositViewTokenAddress = (s: GmxAccountContext) => s.depositViewTokenAddress;
export const selectGmxAccountSetDepositViewTokenAddress = (s: GmxAccountContext) => s.setDepositViewTokenAddress;
export const selectGmxAccountDepositViewTokenInputValue = (s: GmxAccountContext) => s.depositViewTokenInputValue;
export const selectGmxAccountSetDepositViewTokenInputValue = (s: GmxAccountContext) => s.setDepositViewTokenInputValue;

export const selectGmxAccountWithdrawalViewChain = (s: GmxAccountContext) => s.withdrawalViewChain;
export const selectGmxAccountsetWithdrawalViewChain = (s: GmxAccountContext) => s.setWithdrawalViewChain;
export const selectGmxAccountWithdrawalViewTokenAddress = (s: GmxAccountContext) => s.withdrawalViewTokenAddress;
export const selectGmxAccountSetWithdrawalViewTokenAddress = (s: GmxAccountContext) => s.setWithdrawalViewTokenAddress;
export const selectGmxAccountWithdrawalViewTokenInputValue = (s: GmxAccountContext) => s.withdrawalViewTokenInputValue;
export const selectGmxAccountSetWithdrawalViewTokenInputValue = (s: GmxAccountContext) =>
  s.setWithdrawalViewTokenInputValue;

export const selectGmxAccountSelectedTransferGuid = (s: GmxAccountContext) => s.selectedTransferGuid;
export const selectGmxAccountSetSelectedTransferGuid = (s: GmxAccountContext) => s.setSelectedTransferGuid;

//#endregion Pure selectors

//#region Derived selectors

const selectionContext = createSelectionContext<GmxAccountContext>();
const createSelector = selectionContext.makeSelector;

export const selectGmxAccountDepositViewTokenInputAmount = createSelector((q) => {
  const settlementChainId = q(selectGmxAccountSettlementChainId);

  const tokenAddress = q(selectGmxAccountDepositViewTokenAddress);

  if (tokenAddress === undefined) {
    return undefined;
  }

  const inputValue = q(selectGmxAccountDepositViewTokenInputValue);

  if (inputValue === undefined) {
    return undefined;
  }

  const token = getToken(settlementChainId, tokenAddress);

  return parseValue(inputValue, token.decimals);
});

//#endregion Derived selectors
