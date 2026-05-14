import { getAccount } from "@wagmi/core";

import { getWagmiConfig } from "lib/wallets/walletConfig";

export function getRealChainId() {
  const chainId = getAccount(getWagmiConfig()).chainId;

  return chainId;
}
