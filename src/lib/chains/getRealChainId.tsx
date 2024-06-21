import { getAccount } from "@wagmi/core";
import { rainbowKitConfig } from "lib/wallets/rainbowKitConfig";

export function getRealChainId() {
  const chainId = getAccount(rainbowKitConfig).chainId;

  return chainId;
}
