import { Chain, getDefaultConfig, WalletList } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  coreWallet,
  geminiWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import once from "lodash/once";
import { createPublicClient, fallback, http, PublicClient } from "viem";
import { arbitrum, arbitrumSepolia, avalanche, avalancheFuji, base, bsc, optimismSepolia, sepolia } from "viem/chains";

import { botanix, getTestingRpcUrl, getViemChain, RPC_PROVIDERS } from "config/chains";
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
      geminiWallet,
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
      [arbitrum.id]: fallback([...RPC_PROVIDERS[arbitrum.id].map((url) => http(url))]),
      [avalanche.id]: fallback([...RPC_PROVIDERS[avalanche.id].map((url) => http(url))]),
      [avalancheFuji.id]: fallback([...RPC_PROVIDERS[avalancheFuji.id].map((url) => http(url))]),
      [arbitrumSepolia.id]: fallback([...RPC_PROVIDERS[arbitrumSepolia.id].map((url) => http(url))]),
      [base.id]: fallback([...RPC_PROVIDERS[base.id].map((url) => http(url))]),
      [optimismSepolia.id]: fallback([...RPC_PROVIDERS[optimismSepolia.id].map((url) => http(url))]),
      [sepolia.id]: fallback([...RPC_PROVIDERS[sepolia.id].map((url) => http(url))]),
      [botanix.id]: fallback([...RPC_PROVIDERS[botanix.id].map((url) => http(url))]),
      [bsc.id]: fallback([...RPC_PROVIDERS[bsc.id].map((url) => http(url))]),
    },
    wallets: [...popularWalletList, ...othersWalletList],
  })
);

const PUBLIC_CLIENTS_CACHE = new LRUCache<PublicClient>(100);

export function getPublicClientWithRpc(chainId: number): PublicClient {
  // TODO MLTCH DO NOT FORGET TO ADD TESTING KEY TO GITHUB SECRETS
  const primaryRpcUrl =
    import.meta.env.MODE === "test" ? getTestingRpcUrl(chainId) : getCurrentRpcUrls(chainId).primary;
  const key = `chainId:${chainId}-rpcUrl:${primaryRpcUrl}`;
  if (PUBLIC_CLIENTS_CACHE.has(key)) {
    return PUBLIC_CLIENTS_CACHE.get(key)!;
  }
  const publicClient = createPublicClient({
    transport: http(
      primaryRpcUrl,
      import.meta.env.MODE === "test"
        ? {
            fetchOptions: {
              headers: {
                Origin: "http://localhost:3010",
              },
            },
          }
        : undefined
    ),
    chain: getViemChain(chainId),
  });
  PUBLIC_CLIENTS_CACHE.set(key, publicClient);
  return publicClient;
}
