import { memo, useEffect } from "react";
import { useAccount } from "wagmi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useBreakpoints } from "lib/useBreakpoints";

import { GmxAccountModalDesktop } from "./GmxAccountModalDesktop";
import { GmxAccountModalMobile } from "./GmxAccountModalMobile";

export const GmxAccountModal = memo(function GmxAccountModal() {
  const { address: account } = useAccount();
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
