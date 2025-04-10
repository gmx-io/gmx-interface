import type { GmxAccountContext } from "../GmxAccountContext";

export const selectGmxAccountModalOpen = (s: GmxAccountContext) => s.modalOpen;
export const selectGmxAccountSetModalOpen = (s: GmxAccountContext) => s.setModalOpen;

export const selectGmxAccountSettlementChainId = (s: GmxAccountContext) => s.settlementChainId;
export const selectGmxAccountSetSettlementChainId = (s: GmxAccountContext) => s.setSettlementChainId;
//#region Deposit view

export const selectGmxAccountDepositViewChain = (s: GmxAccountContext) => s.depositViewChain;
export const selectGmxAccountSetDepositViewChain = (s: GmxAccountContext) => s.setDepositViewChain;
export const selectGmxAccountDepositViewTokenAddress = (s: GmxAccountContext) => s.depositViewTokenAddress;
export const selectGmxAccountSetDepositViewTokenAddress = (s: GmxAccountContext) => s.setDepositViewTokenAddress;
export const selectGmxAccountDepositViewTokenInputValue = (s: GmxAccountContext) => s.depositViewTokenInputValue;
export const selectGmxAccountSetDepositViewTokenInputValue = (s: GmxAccountContext) => s.setDepositViewTokenInputValue;
//#endregion

//#region Withdraw view

export const selectGmxAccountWithdrawViewChain = (s: GmxAccountContext) => s.withdrawViewChain;
export const selectGmxAccountSetWithdrawViewChain = (s: GmxAccountContext) => s.setWithdrawViewChain;
export const selectGmxAccountWithdrawViewTokenAddress = (s: GmxAccountContext) => s.withdrawViewTokenAddress;
export const selectGmxAccountSetWithdrawViewTokenAddress = (s: GmxAccountContext) => s.setWithdrawViewTokenAddress;
export const selectGmxAccountWithdrawViewTokenInputValue = (s: GmxAccountContext) => s.withdrawViewTokenInputValue;
export const selectGmxAccountSetWithdrawViewTokenInputValue = (s: GmxAccountContext) =>
  s.setWithdrawViewTokenInputValue;
//#endregion

//#region Funding history

export const selectGmxAccountSelectedTransactionHash = (s: GmxAccountContext) => s.selectedTransactionHash;
export const selectGmxAccountSetSelectedTransactionHash = (s: GmxAccountContext) => s.setSelectedTransactionHash;

//#endregion
