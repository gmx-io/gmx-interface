import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { createContext } from "use-context-selector";
import { useAccount } from "wagmi";

import { DEFAULT_SETTLEMENT_CHAIN_ID_MAP, MULTI_CHAIN_TOKEN_MAPPING, isSourceChain } from "config/multichain";
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

  useEffect(() => {
    if (walletChainId === undefined) {
      return;
    }

    const areChainsRelated =
      Object.keys(MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[walletChainId] || {}).length > 0;

    if ((settlementChainId === undefined || !areChainsRelated) && isSourceChain(walletChainId)) {
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
