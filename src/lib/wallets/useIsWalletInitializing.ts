import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useSyncExternalStore } from "react";
import { useAccount, useConfig } from "wagmi";

export function useIsWalletInitializing(): boolean {
  const config = useConfig();
  const { address: account } = useAccount();
  const { ready: isPrivyReady } = usePrivy();
  const { ready: isWalletsReady, wallets } = useWallets();

  const subscribe = useCallback(
    (onChange: () => void) => config.subscribe((state) => state.current, onChange),
    [config]
  );
  const hasRememberedConnection = useSyncExternalStore(subscribe, () => config.state.current !== null);

  if (account || !hasRememberedConnection) {
    return false;
  }

  return !isPrivyReady || !isWalletsReady || wallets.length > 0;
}
