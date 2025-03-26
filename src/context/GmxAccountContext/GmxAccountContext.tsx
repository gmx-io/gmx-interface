import { useState, useMemo, PropsWithChildren } from "react";
import { createContext, useContextSelector, Context } from "use-context-selector";

export type GmxAccountModalView =
  | "main"
  | "availableToTradeAssets"
  | "fundingHistory"
  | "transactionDetails"
  | "deposit"
  | "selectAssetToDeposit"
  | "withdraw"
  | "selectAssetToWithdraw";

export type GmxAccountContext = {
  modalOpen: boolean | GmxAccountModalView;
  setModalOpen: (v: boolean | GmxAccountModalView) => void;

  // deposit view

  depositViewChain: number | undefined;
  setDepositViewChain: (chain: number) => void;

  depositViewTokenAddress: string | undefined;
  setDepositViewTokenAddress: (address: string) => void;

  depositViewTokenInputValue: string | undefined;
  setDepositViewTokenInputValue: (value: string) => void;

  // withdraw view

  withdrawViewChain: number | undefined;
  setWithdrawViewChain: (chain: number) => void;

  withdrawViewTokenAddress: string | undefined;
  setWithdrawViewTokenAddress: (address: string) => void;

  withdrawViewTokenInputValue: string | undefined;
  setWithdrawViewTokenInputValue: (value: string) => void;

  // funding history

  selectedTransactionHash: string | undefined;
  setSelectedTransactionHash: (hash: string) => void;
};

const context = createContext<GmxAccountContext | null>(null);

const selectGmxAccountModalOpen = (s: GmxAccountContext) => s.modalOpen;
const selectGmxAccountSetModalOpen = (s: GmxAccountContext) => s.setModalOpen;

const selectGmxAccountDepositViewChain = (s: GmxAccountContext) => s.depositViewChain;
const selectGmxAccountSetDepositViewChain = (s: GmxAccountContext) => s.setDepositViewChain;
const selectGmxAccountDepositViewTokenAddress = (s: GmxAccountContext) => s.depositViewTokenAddress;
const selectGmxAccountSetDepositViewTokenAddress = (s: GmxAccountContext) => s.setDepositViewTokenAddress;
const selectGmxAccountDepositViewTokenInputValue = (s: GmxAccountContext) => s.depositViewTokenInputValue;
const selectGmxAccountSetDepositViewTokenInputValue = (s: GmxAccountContext) => s.setDepositViewTokenInputValue;

const selectGmxAccountWithdrawViewChain = (s: GmxAccountContext) => s.withdrawViewChain;
const selectGmxAccountSetWithdrawViewChain = (s: GmxAccountContext) => s.setWithdrawViewChain;
const selectGmxAccountWithdrawViewTokenAddress = (s: GmxAccountContext) => s.withdrawViewTokenAddress;
const selectGmxAccountSetWithdrawViewTokenAddress = (s: GmxAccountContext) => s.setWithdrawViewTokenAddress;
const selectGmxAccountWithdrawViewTokenInputValue = (s: GmxAccountContext) => s.withdrawViewTokenInputValue;
const selectGmxAccountSetWithdrawViewTokenInputValue = (s: GmxAccountContext) => s.setWithdrawViewTokenInputValue;

const selectGmxAccountSelectedTransactionHash = (s: GmxAccountContext) => s.selectedTransactionHash;
const selectGmxAccountSetSelectedTransactionHash = (s: GmxAccountContext) => s.setSelectedTransactionHash;

export function GmxAccountContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>("main");

  const [depositViewChain, setDepositViewChain] = useState<GmxAccountContext["depositViewChain"]>(undefined);
  const [depositViewTokenAddress, setDepositViewTokenAddress] =
    useState<GmxAccountContext["depositViewTokenAddress"]>(undefined);
  const [depositViewTokenInputValue, setDepositViewTokenInputValue] =
    useState<GmxAccountContext["depositViewTokenInputValue"]>(undefined);

  const [withdrawViewChain, setWithdrawViewChain] = useState<GmxAccountContext["withdrawViewChain"]>(undefined);
  const [withdrawViewTokenAddress, setWithdrawViewTokenAddress] =
    useState<GmxAccountContext["withdrawViewTokenAddress"]>(undefined);
  const [withdrawViewTokenInputValue, setWithdrawViewTokenInputValue] =
    useState<GmxAccountContext["withdrawViewTokenInputValue"]>(undefined);

  const [selectedTransactionHash, setSelectedTransactionHash] =
    useState<GmxAccountContext["selectedTransactionHash"]>(undefined);

  const value = useMemo(
    () => ({
      modalOpen,
      setModalOpen,

      // deposit view

      depositViewChain,
      setDepositViewChain,
      depositViewTokenAddress,
      setDepositViewTokenAddress,
      depositViewTokenInputValue,
      setDepositViewTokenInputValue,

      // withdraw view

      withdrawViewChain,
      setWithdrawViewChain,
      withdrawViewTokenAddress,
      setWithdrawViewTokenAddress,
      withdrawViewTokenInputValue,
      setWithdrawViewTokenInputValue,

      // funding history

      selectedTransactionHash,
      setSelectedTransactionHash,
    }),
    [
      modalOpen,
      depositViewChain,
      depositViewTokenAddress,
      depositViewTokenInputValue,
      withdrawViewChain,
      withdrawViewTokenAddress,
      withdrawViewTokenInputValue,
      selectedTransactionHash,
    ]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useGmxAccountSelector<Selected>(selector: (s: GmxAccountContext) => Selected) {
  return useContextSelector(context as Context<GmxAccountContext>, selector) as Selected;
}

export function useGmxAccountModalOpen() {
  return [
    useGmxAccountSelector(selectGmxAccountModalOpen),
    useGmxAccountSelector(selectGmxAccountSetModalOpen),
  ] as const;
}

// deposit view

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

export function useGmxAccountSelectedTransactionHash() {
  return [
    useGmxAccountSelector(selectGmxAccountSelectedTransactionHash),
    useGmxAccountSelector(selectGmxAccountSetSelectedTransactionHash),
  ] as const;
}
