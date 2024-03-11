import { WalletList, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  bitgetWallet,
  coinbaseWallet,
  coreWallet,
  imTokenWallet,
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  rainbowWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { isDevelopment } from "config/env";
import { http } from "viem";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "viem/chains";

const WALLET_CONNECT_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";
const APP_NAME = "GMX";

const recommendedWalletList: WalletList = [
  {
    groupName: "Recommended",
    wallets: [injectedWallet, safeWallet, rabbyWallet, metaMaskWallet, walletConnectWallet],
  },
];

const othersWalletList: WalletList = [
  {
    groupName: "Others",
    wallets: [
      coreWallet,
      coinbaseWallet,
      trustWallet,
      okxWallet,
      ledgerWallet,
      rainbowWallet,
      bitgetWallet,
      zerionWallet,
      imTokenWallet,
    ],
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
  wallets: [...recommendedWalletList, ...othersWalletList],
});
