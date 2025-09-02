import { useCallback } from "react";

import type { SourceChainId } from "config/chains";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountModalOpen,
} from "context/GmxAccountContext/hooks";

export function useOpenMultichainDepositModal(): (tokenAddress: string, chainId: SourceChainId) => void {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setDepositViewChain] = useGmxAccountDepositViewChain();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  const onDepositTokenAddress = useCallback(
    (tokenAddress: string, chainId: SourceChainId) => {
      setDepositViewChain(chainId);
      setDepositViewTokenAddress(tokenAddress);
      setIsVisibleOrView("deposit");
    },
    [setDepositViewChain, setDepositViewTokenAddress, setIsVisibleOrView]
  );

  return onDepositTokenAddress;
}
