import { getDefaultConfig, WalletList } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  coreWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { isDevelopment } from "config/env";
import { http } from "viem";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "viem/chains";

import binanceWallet from "./connecters/binanceW3W/binanceWallet";

const WALLET_CONNECT_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";
const APP_NAME = "GMX";

const popularWalletList: WalletList = [
  {
    // Group name with standard name is localized by rainbow kit
    groupName: "Popular",
    wallets: [
      rabbyWallet,
      metaMaskWallet,
      walletConnectWallet,
      // This wallet will automatically hide itself from the list when the fallback is not necessary or if there is no injected wallet available.
      injectedWallet,
      // The Safe option will only appear in the Safe Wallet browser environment.
      safeWallet,
    ],
  },
];

const othersWalletList: WalletList = [
  {
    groupName: "Others",
    wallets: [binanceWallet, coinbaseWallet, trustWallet, coreWallet, okxWallet],
  },
];

export const rainbowKitConfig = getDefaultConfig({
  appName: APP_NAME,
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [arbitrum, avalanche, ...(isDevelopment() ? [arbitrumGoerli, avalancheFuji] : [])],
  transports: {
    [arbitrum.id]: http(),
    [avalanche.id]: http(),
    [arbitrumGoerli.id]: http(),
    [avalancheFuji.id]: http(),
  },
  wallets: [...popularWalletList, ...othersWalletList],
});
