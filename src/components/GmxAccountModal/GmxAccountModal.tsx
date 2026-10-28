import { memo, useEffect } from "react";
import { useAccount } from "wagmi";

import { isSolanaNetwork } from "config/chains";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { useBreakpoints } from "lib/useBreakpoints";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import { GmxAccountModalDesktop } from "./GmxAccountModalDesktop";
import { GmxAccountModalMobile } from "./GmxAccountModalMobile";

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

  return isMobile ? <GmxAccountModalMobile account={account} /> : <GmxAccountModalDesktop account={account} />;
});
