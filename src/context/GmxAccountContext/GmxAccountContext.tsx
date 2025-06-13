import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { createContext } from "use-context-selector";
import { useAccount } from "wagmi";

import {
  DEFAULT_SETTLEMENT_CHAIN_ID_MAP,
  MULTI_CHAIN_SUPPORTED_TOKEN_MAP,
  isSourceChain,
} from "domain/multichain/config";
import { ARBITRUM_SEPOLIA, SettlementChainId, SourceChainId } from "sdk/configs/chains";

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

  withdrawViewTokenAddress: string | undefined;
  setWithdrawViewTokenAddress: (address: string | undefined) => void;

  withdrawViewTokenInputValue: string | undefined;
  setWithdrawViewTokenInputValue: (value: string | undefined) => void;

  // funding history

  selectedTransferGuid: string | undefined;
  setSelectedTransferGuid: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const context = createContext<GmxAccountContext | null>(null);

// TODO: make it ARBITRUM when isDevelopment is false
const DEFAULT_SETTLEMENT_CHAIN_ID: SettlementChainId = ARBITRUM_SEPOLIA;

export function GmxAccountContextProvider({ children }: PropsWithChildren) {
  const { chainId: walletChainId } = useAccount();

  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>(false);

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

  const handleSetModalOpen = useCallback((newModalOpen: boolean | GmxAccountModalView) => {
    setModalOpen(newModalOpen);

    if (newModalOpen === false) {
      setDepositViewChain(undefined);
      setDepositViewTokenAddress(undefined);
      setDepositViewTokenInputValue(undefined);

      setWithdrawViewTokenAddress(undefined);
      setWithdrawViewTokenInputValue(undefined);

      setSelectedTransferGuid(undefined);
    }
  }, []);

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
      setModalOpen: handleSetModalOpen,

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
      handleSetModalOpen,
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
