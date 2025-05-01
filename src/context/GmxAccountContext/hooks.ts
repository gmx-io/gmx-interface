import { useContextSelector, Context } from "use-context-selector";

import { GmxAccountContext, context } from "./GmxAccountContext";
import {
  selectGmxAccountModalOpen,
  selectGmxAccountSetModalOpen,
  selectGmxAccountDepositViewChain,
  selectGmxAccountSetDepositViewChain,
  selectGmxAccountDepositViewTokenAddress,
  selectGmxAccountSetDepositViewTokenAddress,
  selectGmxAccountDepositViewTokenInputValue,
  selectGmxAccountSetDepositViewTokenInputValue,
  selectGmxAccountWithdrawViewChain,
  selectGmxAccountSetWithdrawViewChain,
  selectGmxAccountWithdrawViewTokenAddress,
  selectGmxAccountSetWithdrawViewTokenAddress,
  selectGmxAccountWithdrawViewTokenInputValue,
  selectGmxAccountSetWithdrawViewTokenInputValue,
  selectGmxAccountSelectedTransferGuid,
  selectGmxAccountSetSelectedTransferGuid,
  selectGmxAccountSettlementChainId,
  selectGmxAccountSetSettlementChainId,
} from "./selectors/pure";

export function useGmxAccountSelector<Selected>(selector: (s: GmxAccountContext) => Selected) {
  return useContextSelector(context as Context<GmxAccountContext>, selector) as Selected;
}

export function useGmxAccountModalOpen() {
  return [
    useGmxAccountSelector(selectGmxAccountModalOpen),
    useGmxAccountSelector(selectGmxAccountSetModalOpen),
  ] as const;
}

export function useGmxAccountSettlementChainId() {
  return [
    useGmxAccountSelector(selectGmxAccountSettlementChainId),
    useGmxAccountSelector(selectGmxAccountSetSettlementChainId),
  ] as const;
}

// deposit view

// export function useGmxAccountDepositViewChain() {
//   return [
//     useGmxAccountSelector(selectGmxAccountDepositViewChain),
//     useGmxAccountSelector(selectGmxAccountSetDepositViewChain),
//   ] as const;
// }

export function useGmxAccountDepositViewTokenAddress() {
  return [
    useGmxAccountSelector(selectGmxAccountDepositViewTokenAddress),
    useGmxAccountSelector(selectGmxAccountSetDepositViewTokenAddress),
  ] as const;
}

export function useGmxAccountDepositViewTokenInputValue() {
  return [
    useGmxAccountSelector(selectGmxAccountDepositViewTokenInputValue),
    useGmxAccountSelector(selectGmxAccountSetDepositViewTokenInputValue),
  ] as const;
}
// withdraw view

export function useGmxAccountWithdrawViewChain() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawViewChain),
    useGmxAccountSelector(selectGmxAccountSetWithdrawViewChain),
  ] as const;
}

export function useGmxAccountWithdrawViewTokenAddress() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawViewTokenAddress),
    useGmxAccountSelector(selectGmxAccountSetWithdrawViewTokenAddress),
  ] as const;
}

export function useGmxAccountWithdrawViewTokenInputValue() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawViewTokenInputValue),
    useGmxAccountSelector(selectGmxAccountSetWithdrawViewTokenInputValue),
  ] as const;
}
// funding history

export function useGmxAccountSelectedTransferGuid() {
  return [
    useGmxAccountSelector(selectGmxAccountSelectedTransferGuid),
    useGmxAccountSelector(selectGmxAccountSetSelectedTransferGuid),
  ] as const;
}
