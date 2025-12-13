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
import { createPublicClient, fallback, http, PublicClient, Transport, webSocket } from "viem";

import { getExpressRpcUrl, getViemChain, isTestnetChain, RPC_PROVIDERS } from "config/chains";
import { isDevelopment } from "config/env";
import { getWsUrl } from "lib/rpc";
import { AnyChainId, VIEM_CHAIN_BY_CHAIN_ID } from "sdk/configs/chains";
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

export const getRainbowKitConfig = once(() => {
  const chains = Object.values(VIEM_CHAIN_BY_CHAIN_ID).filter(
    (chain) => isDevelopment() || !isTestnetChain(chain.id)
  ) as [Chain, ...Chain[]];

  const transports = chains.reduce(
    (acc, chain) => {
      acc[chain.id] = fallback([...RPC_PROVIDERS[chain.id].map((url: string) => http(url))]);
      return acc;
    },
    {} as Record<number, Transport>
  );

  return getDefaultConfig({
    appName: APP_NAME,
    projectId: WALLET_CONNECT_PROJECT_ID,
    chains: chains,
    transports: transports,
    wallets: [...popularWalletList, ...othersWalletList],
  });
});

const FALLBACK_TRANSPORTS_CACHE = new LRUCache<Transport>(100);
const PUBLIC_CLIENTS_CACHE = new LRUCache<PublicClient>(100);

const HTTP_TRANSPORT_OPTIONS =
  import.meta.env.MODE === "test"
    ? {
        fetchOptions: {
          headers: {
            Origin: "http://localhost:3010",
          },
        },
      }
    : undefined;

export function getFallbackTransport(chainId: AnyChainId): Transport {
  const key = `chainId:${chainId}`;
  if (FALLBACK_TRANSPORTS_CACHE.has(key)) {
    return FALLBACK_TRANSPORTS_CACHE.get(key)!;
  }
  const transport = fallback([...RPC_PROVIDERS[chainId].map((url: string) => http(url, HTTP_TRANSPORT_OPTIONS))]);
  FALLBACK_TRANSPORTS_CACHE.set(key, transport);
  return transport;
}

export function getPublicClientWithRpc(
  chainId: number,
  options: { withWs?: boolean; withExpress?: boolean } = { withWs: false, withExpress: false }
): PublicClient {
  const key = `chainId:${chainId}:ws:${options.withWs ? 1 : 0}:express:${options.withExpress ? 1 : 0}`;
  if (PUBLIC_CLIENTS_CACHE.has(key)) {
    return PUBLIC_CLIENTS_CACHE.get(key)!;
  }

  let transport: Transport;
  if (options.withWs) {
    const wsUrl = getWsUrl(chainId as AnyChainId);
    if (!wsUrl) {
      // eslint-disable-next-line no-console
      console.warn(`No WebSocket URL found for chain id: ${chainId}. Using HTTP instead.`);
      transport = getFallbackTransport(chainId as AnyChainId);
    } else {
      transport = webSocket(wsUrl);
    }
  } else if (options.withExpress) {
    transport = http(getExpressRpcUrl(chainId), HTTP_TRANSPORT_OPTIONS);
  } else {
    transport = getFallbackTransport(chainId as AnyChainId);
  }

  const publicClient = createPublicClient({
    transport,
    chain: getViemChain(chainId),
  });
  PUBLIC_CLIENTS_CACHE.set(key, publicClient);
  return publicClient;
}
