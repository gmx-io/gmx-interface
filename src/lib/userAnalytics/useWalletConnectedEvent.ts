import { useConnectModal } from "@rainbow-me/rainbowkit";
import useWallet from "lib/wallets/useWallet";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { userAnalytics } from ".";
import { ConnectWalletResultEvent } from "./types";
import { sleep } from "lib/sleep";

export function useWalletConnectedUserAnalyticsEvent() {
  const { connectModalOpen } = useConnectModal();
  const { account } = useWallet();
  const { connector } = useAccount();

  useEffect(() => {
    if (account && connectModalOpen && connector) {
      // Wait for account related data to be loaded
      sleep(1000).then(() => {
        userAnalytics.pushEvent<ConnectWalletResultEvent>({
          event: "ConnectWalletAction",
          data: {
            action: "ConnectedSuccessfully",
            provider: connector.name,
          },
        });
      });
    }
  }, [account, connector, connectModalOpen]);
}
