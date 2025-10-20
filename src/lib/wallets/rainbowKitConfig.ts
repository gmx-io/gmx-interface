import { geminiRainbowKitConnector } from "@gemini-wallet/rainbow";
import { Chain, getDefaultConfig, WalletList } from "@rainbow-me/rainbowkit";
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
import once from "lodash/once";
import { createPublicClient, http, PublicClient } from "viem";
import { arbitrum, arbitrumSepolia, avalanche, avalancheFuji, base, bsc, optimismSepolia, sepolia } from "viem/chains";

import { botanix, getFallbackRpcUrl, getViemChain } from "config/chains";
import { isDevelopment } from "config/env";
import { getCurrentRpcUrls } from "lib/rpc/bestRpcTracker";
import { LRUCache } from "sdk/utils/LruCache";

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
      geminiRainbowKitConnector,
    ],
  },
];

const othersWalletList: WalletList = [
  {
    groupName: "Others",
    wallets: [binanceWallet, coinbaseWallet, trustWallet, coreWallet, okxWallet],
  },
];

export const getRainbowKitConfig = once(() =>
  getDefaultConfig({
    appName: APP_NAME,
    projectId: WALLET_CONNECT_PROJECT_ID,
    chains: [
      arbitrum,
      avalanche,
      botanix as Chain,
      base,
      bsc,
      ...(isDevelopment() ? [avalancheFuji, arbitrumSepolia, optimismSepolia, sepolia] : []),
    ],
    transports: {
      [arbitrum.id]: http(),
      [avalanche.id]: http(),
      [avalancheFuji.id]: http(),
      [arbitrumSepolia.id]: http(getFallbackRpcUrl(arbitrumSepolia.id, false)),
      [base.id]: http(),
      [optimismSepolia.id]: http(getFallbackRpcUrl(optimismSepolia.id, false)),
      [sepolia.id]: http(getFallbackRpcUrl(sepolia.id, false)),
      [botanix.id]: http(),
      [bsc.id]: http(),
    },
    wallets: [...popularWalletList, ...othersWalletList],
  })
);

const PUBLIC_CLIENTS_CACHE = new LRUCache<PublicClient>(100);

export function getPublicClientWithRpc(chainId: number): PublicClient {
  const primaryRpcUrl = getCurrentRpcUrls(chainId).primary;
  const key = `chainId:${chainId}-rpcUrl:${primaryRpcUrl}`;
  if (PUBLIC_CLIENTS_CACHE.has(key)) {
    return PUBLIC_CLIENTS_CACHE.get(key)!;
  }
  const publicClient = createPublicClient({
    transport: http(primaryRpcUrl),
    chain: getViemChain(chainId),
  });
  PUBLIC_CLIENTS_CACHE.set(key, publicClient);
  return publicClient;
}
