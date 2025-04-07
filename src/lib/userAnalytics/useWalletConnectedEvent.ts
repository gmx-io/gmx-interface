import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { useAccountStats } from "domain/synthetics/accountStats/useAccountStats";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { userAnalytics } from ".";
import { ConnectWalletResultEvent } from "./types";

export function useWalletConnectedUserAnalyticsEvent() {
  const [wasConnected, setWasConnected] = useState(false);
  const [wasSent, setWasSent] = useState(false);
  const { chainId } = useChainId();
  const { connectModalOpen } = useConnectModal();
  const { account } = useWallet();
  const { connector } = useAccount();

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: true,
  });

  const ordersCount = accountStats?.closedCount;

  useEffect(() => {
    if (!wasSent && !wasConnected && account && connectModalOpen) {
      setWasConnected(true);
    }
  }, [account, connector, connectModalOpen, wasConnected, wasSent]);

  useEffect(() => {
    let timeoutId: number;

    if (wasConnected && !wasSent && connector) {
      const sendEvent = () => {
        setWasSent(true);
        userAnalytics.pushEvent<ConnectWalletResultEvent>({
          event: "ConnectWalletAction",
          data: {
            action: "ConnectedSuccessfully",
            provider: connector.name,
            ordersCount,
          },
        });
      };

      if (ordersCount !== undefined) {
        sendEvent();
      } else {
        timeoutId = window.setTimeout(sendEvent, 2000);
      }
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [account, connector, connectModalOpen, ordersCount, wasConnected, wasSent]);
}
