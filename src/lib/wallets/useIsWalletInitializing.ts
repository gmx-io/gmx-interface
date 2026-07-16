import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

// @privy-io/wagmi forces reconnectOnMount: false, so while Privy restores the session on page load
// wagmi reports plain "disconnected" (never "reconnecting")
export function useIsWalletInitializing(): boolean {
  const { address: account, isConnecting, isReconnecting } = useAccount();
  const { ready: isPrivyReady } = usePrivy();
  const { ready: isWalletsReady, wallets } = useWallets();

  return !isPrivyReady || !isWalletsReady || (wallets.length > 0 && !account) || isConnecting || isReconnecting;
}
