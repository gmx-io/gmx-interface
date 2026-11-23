import { lazy, memo, Suspense, useEffect } from "react";
import { useAccount } from "wagmi";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { isSolanaNetwork } from "config/chains";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { useBreakpoints } from "lib/useBreakpoints";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import { GmxAccountModalDesktop } from "./GmxAccountModalDesktop";
import { GmxAccountModalMobile } from "./GmxAccountModalMobile";

const GmsolWalletAssetsProvider = lazy(() => import("domain/gmsol/GmsolWalletAssetsProvider"));

export const GmxAccountModal = memo(function GmxAccountModal() {
  const { address: evmAccount } = useAccount();
  const { networkId } = useChainId();
  const solanaWallet = useSolanaWalletSession();
  const isSolanaSelected = isSolanaNetwork(networkId);
  const account = isSolanaSelected ? solanaWallet.address : evmAccount;
  const { isMobile } = useBreakpoints();
  const [modalState, setModalState] = useGmxAccountModalOpen();

  const isOpen = modalState !== false;

  useEffect(() => {
    if (!account && isOpen) {
      setModalState(false);
    }
  }, [account, isOpen, setModalState]);

  if (!account) {
    return null;
  }

  const modal = isMobile ? <GmxAccountModalMobile account={account} /> : <GmxAccountModalDesktop account={account} />;

  if (isSolanaSelected && isOpen && getIsSolanaNetworkEnabled()) {
    return (
      <Suspense fallback={modal}>
        <GmsolWalletAssetsProvider owner={account}>{modal}</GmsolWalletAssetsProvider>
      </Suspense>
    );
  }

  return modal;
});
