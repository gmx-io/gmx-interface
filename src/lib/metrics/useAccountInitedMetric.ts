import { useEffect } from "react";

import useWallet from "lib/wallets/useWallet";

import { AccountInitedEvent, metrics } from ".";

let isSent = false;

export function useAccountInitedMetric() {
  const { account } = useWallet();

  useEffect(() => {
    if (account && !isSent) {
      metrics.pushEvent<AccountInitedEvent>({
        event: "accountInited",
        isError: false,
        data: {},
      });
      isSent = true;
    }
  }, [account]);
}
