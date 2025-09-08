import { Context, useContextSelector } from "use-context-selector";

import { GmxAccountContext, context } from "./GmxAccountContext";
import {
  selectGmxAccountDepositViewChain,
  selectGmxAccountDepositViewTokenAddress,
  selectGmxAccountDepositViewTokenInputValue,
  selectGmxAccountModalOpen,
  selectGmxAccountSelectedTransferGuid,
  selectGmxAccountSetDepositViewChain,
  selectGmxAccountSetDepositViewTokenAddress,
  selectGmxAccountSetDepositViewTokenInputValue,
  selectGmxAccountSetModalOpen,
  selectGmxAccountSetSelectedTransferGuid,
  selectGmxAccountSetSettlementChainId,
  selectGmxAccountsetWithdrawalViewChain,
  selectGmxAccountSetWithdrawalViewTokenAddress,
  selectGmxAccountSetWithdrawalViewTokenInputValue,
  selectGmxAccountSettlementChainId,
  selectGmxAccountWithdrawalViewChain,
  selectGmxAccountWithdrawalViewTokenAddress,
  selectGmxAccountWithdrawalViewTokenInputValue,
} from "./selectors";

export function useGmxAccountSelector<Selected>(selector: (s: GmxAccountContext) => Selected) {
  return useContextSelector(context as Context<GmxAccountContext>, selector) as Selected;
}

export function useGmxAccountModalOpen() {
  return [
    useGmxAccountSelector(selectGmxAccountModalOpen),
    useGmxAccountSelector(selectGmxAccountSetModalOpen),
  ] as const;
}

/**
 * If you just need the settlement chain id and not updating it, use `useChainId` instead
 */
export function useGmxAccountSettlementChainId() {
  return [
    useGmxAccountSelector(selectGmxAccountSettlementChainId),
    useGmxAccountSelector(selectGmxAccountSetSettlementChainId),
  ] as const;
}

export function useGmxAccountDepositViewChain() {
  return [
    useGmxAccountSelector(selectGmxAccountDepositViewChain),
    useGmxAccountSelector(selectGmxAccountSetDepositViewChain),
  ] as const;
}

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

export function useGmxAccountWithdrawalViewChain() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawalViewChain),
    useGmxAccountSelector(selectGmxAccountsetWithdrawalViewChain),
  ] as const;
}

export function useGmxAccountWithdrawalViewTokenAddress() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawalViewTokenAddress),
    useGmxAccountSelector(selectGmxAccountSetWithdrawalViewTokenAddress),
  ] as const;
}

export function useGmxAccountWithdrawalViewTokenInputValue() {
  return [
    useGmxAccountSelector(selectGmxAccountWithdrawalViewTokenInputValue),
    useGmxAccountSelector(selectGmxAccountSetWithdrawalViewTokenInputValue),
  ] as const;
}

export function useGmxAccountSelectedTransferGuid() {
  return [
    useGmxAccountSelector(selectGmxAccountSelectedTransferGuid),
    useGmxAccountSelector(selectGmxAccountSetSelectedTransferGuid),
  ] as const;
}
