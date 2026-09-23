import { memo, useEffect } from "react";
import { useAccount } from "wagmi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { useBreakpoints } from "lib/useBreakpoints";
import { useSolanaAssetsConnection } from "solana-interface/wallet/useSolanaAssets";
import { useSolanaWallet } from "solana-interface/wallet/useSolanaWallet";

import { GmxAccountModalDesktop } from "./GmxAccountModalDesktop";
import { GmxAccountModalMobile } from "./GmxAccountModalMobile";

export const GmxAccountModal = memo(function GmxAccountModal() {
  const { address: evmAccount } = useAccount();
  const { isSolana } = useChainId();
  const solanaWallet = useSolanaWallet();
  const account = isSolana ? solanaWallet.address : evmAccount;
  useSolanaAssetsConnection(isSolana ? solanaWallet.address : undefined);
  const { isMobile } = useBreakpoints();
  const [modalState, setModalState] = useGmxAccountModalOpen();

  const isOpen = modalState !== false;

  useEffect(() => {
    if (!account && isOpen) {
      setModalState(false);
    }
  }, [account, isOpen, setModalState]);

  useEffect(() => {
    if (!isSolana || modalState === false || modalState === "main" || modalState === "availableToTradeAssets") return;
    setModalState("main");
  }, [isSolana, modalState, setModalState]);

  if (!account) {
    return null;
  }

  return isMobile ? <GmxAccountModalMobile account={account} /> : <GmxAccountModalDesktop account={account} />;
});
