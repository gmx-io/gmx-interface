import { watchAccount } from "@wagmi/core";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { getRealChainId } from "lib/chains/getRealChainId";
import { INVALID_NETWORK_TOAST_ID, getInvalidNetworkErrorMessage } from "lib/contracts/transactionErrors";
import { rainbowKitConfig } from "lib/wallets/rainbowKitConfig";

const context = createContext<number | undefined>(undefined);
const { Provider } = context;

const toastSubscribe = (onStoreChange: () => void): (() => void) => {
  const cleanup = toast.onChange(({ id }) => {
    if (id === INVALID_NETWORK_TOAST_ID) {
      onStoreChange();
    }
  });

  return cleanup;
};

const toastGetSnapshot = () => toast.isActive(INVALID_NETWORK_TOAST_ID);

export function RealChainIdProvider({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = useState(() => getRealChainId());
  const { chainId: assumedChainId } = useChainId();
  const { isConnected } = useAccount();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  useEffect(() => {
    const timer = setInterval(() => {
      const realChainId = getRealChainId();

      if (realChainId !== chainId) {
        setChainId(realChainId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [chainId]);

  useEffect(() => {
    if (chainId !== undefined && chainId !== assumedChainId && !isActive && isConnected) {
      toast.error(getInvalidNetworkErrorMessage(assumedChainId), {
        toastId: INVALID_NETWORK_TOAST_ID,
        autoClose: false,
        closeButton: false,
      });
    } else if ((chainId === assumedChainId || !isConnected || chainId === undefined) && isActive) {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    }
  }, [assumedChainId, chainId, isActive, isConnected]);

  useEffect(() => {
    return () => {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);

  useEffect(() => {
    const unwatch = watchAccount(rainbowKitConfig, {
      onChange: () => {
        const realChainId = getRealChainId();

        setChainId(realChainId);
      },
    } as any);
    return () => unwatch();
  }, []);

  return <Provider value={chainId}>{children}</Provider>;
}

export function useRealChainId() {
  return useContext(context);
}
