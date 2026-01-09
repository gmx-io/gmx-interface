import { PropsWithChildren, useCallback, useMemo, useState } from "react";
import { createContext } from "use-context-selector";
import { useAccount } from "wagmi";

import { isDevelopment } from "config/env";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY, SELECTED_SETTLEMENT_CHAIN_ID_KEY } from "config/localStorage";
import { DEFAULT_SETTLEMENT_CHAIN_ID_MAP, isSettlementChain } from "config/multichain";
import { areChainsRelated } from "domain/multichain/areChainsRelated";
import { ARBITRUM, ARBITRUM_SEPOLIA, SettlementChainId, SourceChainId } from "sdk/configs/chains";

export type GmxAccountModalView =
  | "main"
  | "availableToTradeAssets"
  | "transferDetails"
  | "deposit"
  | "depositStatus"
  | "selectAssetToDeposit"
  | "withdraw";

export type GmxAccountContext = {
  modalOpen: boolean | GmxAccountModalView;
  setModalOpen: (v: boolean | GmxAccountModalView) => void;

  settlementChainId: SettlementChainId;
  setSettlementChainId: (chainId: SettlementChainId) => void;

  // deposit view

  depositViewChain: SourceChainId | undefined;
  setDepositViewChain: (chain: SourceChainId | undefined) => void;

  depositViewTokenAddress: string | undefined;
  setDepositViewTokenAddress: (address: string | undefined) => void;

  depositViewTokenInputValue: string | undefined;
  setDepositViewTokenInputValue: (value: string | undefined) => void;

  // withdraw view

  withdrawalViewChain: SourceChainId | undefined;
  setWithdrawalViewChain: (chain: SourceChainId | undefined) => void;

  withdrawalViewTokenAddress: string | undefined;
  setWithdrawalViewTokenAddress: (address: string | undefined) => void;

  withdrawalViewTokenInputValue: string | undefined;
  setWithdrawalViewTokenInputValue: (value: string | undefined) => void;

  // funding history

  selectedTransferGuid: string | undefined;
  setSelectedTransferGuid: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const context = createContext<GmxAccountContext | null>(null);

export const DEFAULT_SETTLEMENT_CHAIN_ID: SettlementChainId = isDevelopment() ? ARBITRUM_SEPOLIA : ARBITRUM;

const getSettlementChainIdFromLocalStorage = () => {
  const settlementChainIdFromLocalStorage = localStorage.getItem(SELECTED_SETTLEMENT_CHAIN_ID_KEY);

  if (settlementChainIdFromLocalStorage) {
    const settlementChainId = parseInt(settlementChainIdFromLocalStorage);
    if (isSettlementChain(settlementChainId)) {
      return settlementChainId;
    }
  }

  const unsanitizedChainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);

  if (!unsanitizedChainId) {
    return DEFAULT_SETTLEMENT_CHAIN_ID;
  }

  const chainIdFromLocalStorage = parseInt(unsanitizedChainId);

  if (!isSettlementChain(chainIdFromLocalStorage)) {
    return DEFAULT_SETTLEMENT_CHAIN_ID;
  }

  return chainIdFromLocalStorage;
};

export function GmxAccountContextProvider({ children }: PropsWithChildren) {
  const { chainId: walletChainId } = useAccount();

  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>(false);

  let [settlementChainId, setSettlementChainId] = useState<GmxAccountContext["settlementChainId"]>(
    getSettlementChainIdFromLocalStorage()
  );

  if (walletChainId !== undefined && !areChainsRelated(settlementChainId, walletChainId as SourceChainId)) {
    if (isSettlementChain(walletChainId as SettlementChainId)) {
      settlementChainId = walletChainId as SettlementChainId;
    } else {
      settlementChainId =
        DEFAULT_SETTLEMENT_CHAIN_ID_MAP[walletChainId as SourceChainId] ?? DEFAULT_SETTLEMENT_CHAIN_ID;
    }
  }

  const handleSetSettlementChainId = useCallback((chainId: SettlementChainId) => {
    setSettlementChainId(chainId);
    localStorage.setItem(SELECTED_SETTLEMENT_CHAIN_ID_KEY, chainId.toString());
  }, []);

  const [depositViewChain, setDepositViewChain] = useState<GmxAccountContext["depositViewChain"]>(undefined);
  const [depositViewTokenAddress, setDepositViewTokenAddress] =
    useState<GmxAccountContext["depositViewTokenAddress"]>(undefined);
  const [depositViewTokenInputValue, setDepositViewTokenInputValue] =
    useState<GmxAccountContext["depositViewTokenInputValue"]>(undefined);

  const [withdrawalViewChain, setWithdrawalViewChain] = useState<GmxAccountContext["withdrawalViewChain"]>(undefined);
  const [withdrawalViewTokenAddress, setWithdrawalViewTokenAddress] =
    useState<GmxAccountContext["withdrawalViewTokenAddress"]>(undefined);
  const [withdrawalViewTokenInputValue, setWithdrawalViewTokenInputValue] =
    useState<GmxAccountContext["withdrawalViewTokenInputValue"]>(undefined);

  const [selectedTransferGuid, setSelectedTransferGuid] =
    useState<GmxAccountContext["selectedTransferGuid"]>(undefined);

  const handleSetModalOpen = useCallback((newModalOpen: boolean | GmxAccountModalView) => {
    setModalOpen(newModalOpen);

    if (newModalOpen === false) {
      setDepositViewChain(undefined);
      setDepositViewTokenAddress(undefined);
      setDepositViewTokenInputValue(undefined);

      setWithdrawalViewTokenAddress(undefined);
      setWithdrawalViewTokenInputValue(undefined);

      setSelectedTransferGuid(undefined);
    }
  }, []);

  const value = useMemo(
    () => ({
      modalOpen,
      setModalOpen: handleSetModalOpen,

      settlementChainId,
      setSettlementChainId: handleSetSettlementChainId,

      // deposit view

      depositViewChain,
      setDepositViewChain,
      depositViewTokenAddress,
      setDepositViewTokenAddress,
      depositViewTokenInputValue,
      setDepositViewTokenInputValue,

      // withdraw view

      withdrawalViewChain,
      setWithdrawalViewChain,
      withdrawalViewTokenAddress,
      setWithdrawalViewTokenAddress,
      withdrawalViewTokenInputValue,
      setWithdrawalViewTokenInputValue,

      // funding history

      selectedTransferGuid,
      setSelectedTransferGuid,
    }),
    [
      modalOpen,
      handleSetModalOpen,
      settlementChainId,
      handleSetSettlementChainId,
      depositViewChain,
      depositViewTokenAddress,
      depositViewTokenInputValue,
      withdrawalViewChain,
      withdrawalViewTokenAddress,
      withdrawalViewTokenInputValue,
      selectedTransferGuid,
    ]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}
