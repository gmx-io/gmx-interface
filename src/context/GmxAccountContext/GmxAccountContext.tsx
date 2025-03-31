import { PropsWithChildren, useMemo, useState } from "react";
import { createContext } from "use-context-selector";

import { ARBITRUM } from "sdk/configs/chains";
import "./config";

export type GmxAccountModalView =
  | "main"
  | "availableToTradeAssets"
  | "transactionDetails"
  | "deposit"
  | "selectAssetToDeposit"
  | "withdraw";

export type GmxAccountContext = {
  modalOpen: boolean | GmxAccountModalView;
  setModalOpen: (v: boolean | GmxAccountModalView) => void;

  settlementChainId: number;
  setSettlementChainId: (chainId: number) => void;

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

export const context = createContext<GmxAccountContext | null>(null);

export function GmxAccountContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>("main");

  const [settlementChainId, setSettlementChainId] = useState<GmxAccountContext["settlementChainId"]>(ARBITRUM);

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

      settlementChainId,
      setSettlementChainId,

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
      settlementChainId,
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
