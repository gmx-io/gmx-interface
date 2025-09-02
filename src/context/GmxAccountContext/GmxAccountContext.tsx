import { t } from "@lingui/macro";
import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { createContext } from "use-context-selector";
import { useAccount } from "wagmi";

import { isDevelopment } from "config/env";
import {
  IS_SOURCE_BASE_ALLOWED_KEY,
  IS_SOURCE_BASE_ALLOWED_NOTIFICATION_SHOWN_KEY,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_SETTLEMENT_CHAIN_ID_KEY,
} from "config/localStorage";
import {
  DEFAULT_SETTLEMENT_CHAIN_ID_MAP,
  IS_SOURCE_BASE_ALLOWED,
  MULTICHAIN_TOKEN_MAPPING,
  isSettlementChain,
  isSourceChain,
} from "config/multichain";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ARBITRUM, ARBITRUM_SEPOLIA, SettlementChainId, SourceChainId } from "sdk/configs/chains";

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

const DEFAULT_SETTLEMENT_CHAIN_ID: SettlementChainId = isDevelopment() ? ARBITRUM_SEPOLIA : ARBITRUM;

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
  useMultichainUrlEnabled();

  const [modalOpen, setModalOpen] = useState<GmxAccountContext["modalOpen"]>(false);

  const [settlementChainId, setSettlementChainId] = useState<GmxAccountContext["settlementChainId"]>(
    getSettlementChainIdFromLocalStorage()
  );

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

  useEffect(() => {
    let probableSourceChain: SourceChainId | undefined = walletChainId as SourceChainId | undefined;
    if (walletChainId === undefined) {
      const unsanitizedChainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      if (!unsanitizedChainId) {
        return;
      }

      const chainIdFromLocalStorage = parseInt(unsanitizedChainId);

      if (!isSourceChain(chainIdFromLocalStorage)) {
        return;
      }

      probableSourceChain = chainIdFromLocalStorage;
    }

    if (!isSourceChain(probableSourceChain)) {
      return;
    }

    const areChainsRelated =
      Object.keys(MULTICHAIN_TOKEN_MAPPING[settlementChainId]?.[probableSourceChain] || {}).length > 0;

    if (settlementChainId === undefined || !areChainsRelated) {
      handleSetSettlementChainId(DEFAULT_SETTLEMENT_CHAIN_ID_MAP[probableSourceChain] ?? DEFAULT_SETTLEMENT_CHAIN_ID);
    }
  }, [handleSetSettlementChainId, settlementChainId, walletChainId]);

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

function useMultichainUrlEnabled() {
  const history = useHistory();
  const location = useLocation();
  const isReloadingRef = useRef(false);

  const [isSourceBaseAllowedNotificationShown, setIsSourceBaseAllowedNotificationShown] = useLocalStorageSerializeKey(
    IS_SOURCE_BASE_ALLOWED_NOTIFICATION_SHOWN_KEY,
    false
  );

  useEffect(() => {
    if (isReloadingRef.current) {
      return;
    }

    const query = new URLSearchParams(location.search);

    const param = query.get(IS_SOURCE_BASE_ALLOWED_KEY);

    if (param) {
      query.delete(IS_SOURCE_BASE_ALLOWED_KEY);
      history.replace({ search: query.toString() });
      if (param === "1" && !IS_SOURCE_BASE_ALLOWED) {
        localStorage.setItem(IS_SOURCE_BASE_ALLOWED_KEY, "1");

        isReloadingRef.current = true;
        window.location.reload();
      } else if (param === "0" && IS_SOURCE_BASE_ALLOWED) {
        localStorage.removeItem(IS_SOURCE_BASE_ALLOWED_KEY);
        setIsSourceBaseAllowedNotificationShown(false);
        isReloadingRef.current = true;
        window.location.reload();
      }
    } else if (IS_SOURCE_BASE_ALLOWED && !isSourceBaseAllowedNotificationShown) {
      setIsSourceBaseAllowedNotificationShown(true);
      setTimeout(() => {
        helperToast.success(t`Source Base is now available on GMX`);
      }, 2000);
    }
  }, [history, isSourceBaseAllowedNotificationShown, location.search, setIsSourceBaseAllowedNotificationShown]);
}
