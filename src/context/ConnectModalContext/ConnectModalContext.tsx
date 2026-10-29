import { useConnectOrCreateWallet, useConnectWallet, useModalStatus, usePrivy } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { type SettlementChainId, isSolanaNetwork } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { metrics } from "lib/metrics";
import { useBlockAutoReload } from "lib/pwa/blockAutoReload";
import { switchNetwork } from "lib/wallets";
import {
  captureEvmSession,
  type EvmSessionSnapshot,
  getPrivyWagmiConnectorId,
  restoreEvmSessionAfterSolanaConnect,
  shouldUpdateSolanaLinkedEvmConnectors,
} from "lib/wallets/privyWagmi";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import { getWagmiConfig, PRIVY_SOLANA_WALLET_LIST } from "lib/wallets/walletConfig";

export type ConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
};

export const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
});

function shouldKeepAppSelectedSourceChain(settlementChainId: SettlementChainId) {
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  return selectedNetworkWasAppSelected && isSourceChain(chainIdFromLocalStorage, settlementChainId);
}

async function keepEvmSession(snapshot: EvmSessionSnapshot | undefined, walletName: string) {
  if (snapshot) {
    await restoreEvmSessionAfterSolanaConnect(snapshot);
  }

  if (!getIsSolanaNetworkEnabled()) {
    return;
  }

  const { detachSolanaLinkedEvmConnectors } = await import("lib/wallets/solanaLinkedEvmConnectors");
  await detachSolanaLinkedEvmConnectors(walletName, getWagmiConfig(), snapshot?.connectedConnectorIds ?? []);
}

type ConnectWalletSuccess = Parameters<
  NonNullable<NonNullable<Parameters<typeof useConnectWallet>[0]>["onSuccess"]>
>[0];

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { networkId } = useChainId();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const connectRequestInFlightRef = useRef(false);
  const { isOpen: privyModalOpen } = useModalStatus();
  const { authenticated } = usePrivy();
  const { rememberConnectedWallet } = useSolanaWalletSession();
  const evmSessionRef = useRef<EvmSessionSnapshot>();

  useBlockAutoReload(connectModalOpen || privyModalOpen);

  const handleSuccess = useCallback(
    ({ wallet }: ConnectWalletSuccess) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);

      // A Solana connect leaves the EVM session and the selected network as they are.
      if (wallet.type === "solana") {
        rememberConnectedWallet(wallet.meta.id);
        const snapshot = evmSessionRef.current;
        evmSessionRef.current = undefined;
        void keepEvmSession(snapshot, wallet.meta.name).catch((error) => {
          metrics.pushError(error, "connectModal.keepEvmSession");
        });
        return;
      }

      // @privy-io/wagmi already handles this callback by setting recentConnectorId
      // and reconnecting wagmi. Calling setActiveWallet here can re-enter wagmi connect.
      if (isSolanaNetwork(networkId) || shouldKeepAppSelectedSourceChain(settlementChainId)) {
        return;
      }

      void switchNetwork(settlementChainId, true).catch((error) => {
        metrics.pushError(error, "connectModal.switchNetwork");
      });
    },
    [networkId, rememberConnectedWallet, settlementChainId]
  );

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleSuccess,
    onError: (error) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.connectOrCreateWallet");
    },
  });
  const handleConnectWalletSuccess = useCallback(
    ({ wallet }: ConnectWalletSuccess) => {
      // Only connectWallet's onSuccess means the user picked this wallet. connectOrCreateWallet's onSuccess
      // also fires when the modal closes, with whichever wallet Privy lists first.
      if (wallet.type !== "solana" && shouldUpdateSolanaLinkedEvmConnectors()) {
        const connectorId = getPrivyWagmiConnectorId(wallet);
        void import("lib/wallets/solanaLinkedEvmConnectors")
          .then(({ rememberPickedEvmConnector }) => rememberPickedEvmConnector(connectorId))
          .catch((error) => {
            metrics.pushError(error, "connectModal.rememberPickedEvmConnector");
          });
      }

      handleSuccess({ wallet });
    },
    [handleSuccess]
  );

  const { connectWallet } = useConnectWallet({
    onSuccess: handleConnectWalletSuccess,
    onError: (error) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.connectWallet");
    },
  });

  useEffect(() => {
    if (!privyModalOpen) {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
    }
  }, [privyModalOpen]);

  const openConnectModal = useCallback(() => {
    // MetaMask rejects duplicate connection requests while the first one is pending.
    if (connectRequestInFlightRef.current) {
      return;
    }

    const isSolanaSelected = isSolanaNetwork(networkId);

    connectRequestInFlightRef.current = true;
    setConnectModalOpen(true);
    try {
      if (isSolanaSelected) {
        evmSessionRef.current = captureEvmSession();
        // connectOrCreateWallet() takes no options and login() asks for a SIWS signature.
        connectWallet({ walletChainType: "solana-only", walletList: PRIVY_SOLANA_WALLET_LIST });
      } else if (authenticated) {
        // Privy rejects connectOrCreateWallet for already-authenticated sessions.
        connectWallet();
      } else {
        connectOrCreateWallet();
      }
    } catch (error) {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.open");
    }
  }, [authenticated, connectOrCreateWallet, connectWallet, networkId]);

  const value = useMemo(() => ({ openConnectModal, connectModalOpen }), [openConnectModal, connectModalOpen]);

  return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>;
}

/**
 * Drop-in replacement for RainbowKit's useConnectModal.
 * Returns { openConnectModal, connectModalOpen } with the same interface.
 */
export function useConnectModal() {
  return useContext(ConnectModalContext);
}
