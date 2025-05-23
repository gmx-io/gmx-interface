import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { createContext } from "use-context-selector";
import { useAccount } from "wagmi";

import { ARBITRUM_SEPOLIA, UiSettlementChain, UiSourceChain } from "sdk/configs/chains";

import { DEFAULT_SETTLEMENT_CHAIN_ID_MAP, MULTI_CHAIN_SUPPORTED_TOKEN_MAP, isSourceChain } from "./config";

export type GmxAccountModalView =
  | "main"
  | "availableToTradeAssets"
  | "transferDetails"
  | "deposit"
  | "selectAssetToDeposit"
  | "withdraw";

export type GmxAccountContext = {
  modalOpen: boolean | GmxAccountModalView;
  setModalOpen: (v: boolean | GmxAccountModalView) => void;

  settlementChainId: UiSettlementChain;
  setSettlementChainId: (chainId: UiSettlementChain) => void;

  // deposit view

  depositViewChain: UiSourceChain | undefined;
  setDepositViewChain: (chain: UiSourceChain) => void;

  depositViewTokenAddress: string | undefined;
  setDepositViewTokenAddress: (address: string) => void;

  depositViewTokenInputValue: string | undefined;
  setDepositViewTokenInputValue: (value: string) => void;

  // withdraw view

  withdrawViewTokenAddress: string | undefined;
  setWithdrawViewTokenAddress: (address: string) => void;

  withdrawViewTokenInputValue: string | undefined;
  setWithdrawViewTokenInputValue: (value: string) => void;

  // funding history

  selectedTransferGuid: string | undefined;
  setSelectedTransferGuid: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const context = createContext<GmxAccountContext | null>(null);

// TODO: make it ARBITRUM when isDevelopment is false
const DEFAULT_SETTLEMENT_CHAIN_ID: UiSettlementChain = ARBITRUM_SEPOLIA;

export function GmxAccountContextProvider({ children }: PropsWithChildren) {
  const { chainId: walletChainId } = useAccount();

  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>("main");

  const [settlementChainId, setSettlementChainId] =
    useState<GmxAccountContext["settlementChainId"]>(DEFAULT_SETTLEMENT_CHAIN_ID);

  const [depositViewChain, setDepositViewChain] = useState<GmxAccountContext["depositViewChain"]>(undefined);
  const [depositViewTokenAddress, setDepositViewTokenAddress] =
    useState<GmxAccountContext["depositViewTokenAddress"]>(undefined);
  const [depositViewTokenInputValue, setDepositViewTokenInputValue] =
    useState<GmxAccountContext["depositViewTokenInputValue"]>(undefined);

  const [withdrawViewTokenAddress, setWithdrawViewTokenAddress] =
    useState<GmxAccountContext["withdrawViewTokenAddress"]>(undefined);
  const [withdrawViewTokenInputValue, setWithdrawViewTokenInputValue] =
    useState<GmxAccountContext["withdrawViewTokenInputValue"]>(undefined);

  const [selectedTransferGuid, setSelectedTransferGuid] =
    useState<GmxAccountContext["selectedTransferGuid"]>(undefined);

  useEffect(() => {
    if (walletChainId === undefined) {
      return;
    }

    const areChainsConnected =
      Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[settlementChainId]?.[walletChainId] || {}).length > 0;

    if ((settlementChainId === undefined || !areChainsConnected) && isSourceChain(walletChainId)) {
      setSettlementChainId(DEFAULT_SETTLEMENT_CHAIN_ID_MAP[walletChainId] ?? ARBITRUM_SEPOLIA);
    }
  }, [settlementChainId, walletChainId]);

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

      withdrawViewTokenAddress,
      setWithdrawViewTokenAddress,
      withdrawViewTokenInputValue,
      setWithdrawViewTokenInputValue,

      // funding history

      selectedTransferGuid,
      setSelectedTransferGuid,
    }),
    [
      modalOpen,
      settlementChainId,
      depositViewChain,
      depositViewTokenAddress,
      depositViewTokenInputValue,
      withdrawViewTokenAddress,
      withdrawViewTokenInputValue,
      selectedTransferGuid,
    ]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}
