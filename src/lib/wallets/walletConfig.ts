import { createConfig } from "@privy-io/wagmi";
import once from "lodash/once";
import {
  Chain,
  createPublicClient,
  fallback,
  http,
  PublicClient,
  Transport,
  webSocket,
  WebSocketTransport,
} from "viem";

import { getViemChain, isTestnetChain } from "config/chains";
import { isDevelopment } from "config/env";
import { PRIVY_APP_ID } from "config/privy";
import { getRpcProviders, RpcConfig } from "config/rpc";
import { RpcPurpose } from "config/rpc";
import { metrics, ViemWsClientConnected, ViemWsClientDisconnected, ViemWsClientError } from "lib/metrics";
import { getWsUrl } from "lib/rpc";
import { AnyChainId, VIEM_CHAIN_BY_CHAIN_ID } from "sdk/configs/chains";
import { LRUCache } from "sdk/utils/LruCache";

export { PRIVY_APP_ID };

export const PRIVY_WALLET_LIST = [
  "detected_ethereum_wallets",
  "metamask",
  "rabby_wallet",
  "phantom",
  "wallet_connect",
] as const;

export const PRIVY_LOGIN_METHODS = ["wallet", "email", "google", "twitter", "discord"] as const;

export function getSupportedChains(): [Chain, ...Chain[]] {
  return Object.values(VIEM_CHAIN_BY_CHAIN_ID).filter((chain) => isDevelopment() || !isTestnetChain(chain.id)) as [
    Chain,
    ...Chain[],
  ];
}

export const getWagmiConfig = once(() => {
  const chains = getSupportedChains();

  const transports = chains.reduce(
    (acc, chain) => {
      const rpcProviders = getRpcProviders(chain.id, "default");
      acc[chain.id] = fallback([...rpcProviders.map((provider) => http(provider.url))]);
      return acc;
    },
    {} as Record<number, Transport>
  );

  return createConfig({
    chains,
    transports,
  });
});

const TRANSPORTS_CACHE = new LRUCache<Transport>(100);
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

export function getRpcTransport(chainId: AnyChainId, purpose: RpcPurpose): Transport {
  const key = `chainId:${chainId}:purpose:${purpose}`;
  if (TRANSPORTS_CACHE.has(key)) {
    return TRANSPORTS_CACHE.get(key)!;
  }
  const transport = fallback(
    getRpcProviders(chainId, purpose).map((provider: RpcConfig) => http(provider.url, HTTP_TRANSPORT_OPTIONS))
  );
  TRANSPORTS_CACHE.set(key, transport);
  return transport;
}

export function getPublicClientWithRpc(
  chainId: number,
  options: { withWs?: boolean; withExpress?: boolean } = { withWs: false, withExpress: false }
): PublicClient {
  const normalizedOptions = options.withWs ? { withWs: true, withExpress: false } : options;
  const key = `chainId:${chainId}:ws:${normalizedOptions.withWs ? 1 : 0}:express:${normalizedOptions.withExpress ? 1 : 0}`;
  if (PUBLIC_CLIENTS_CACHE.has(key)) {
    return PUBLIC_CLIENTS_CACHE.get(key)!;
  }

  let transport: Transport;
  let isWsTransport = false;
  if (normalizedOptions.withWs) {
    const wsUrl = getWsUrl(chainId as AnyChainId);
    if (!wsUrl) {
      // eslint-disable-next-line no-console
      console.warn(`No WebSocket URL found for chain id: ${chainId}. Using HTTP instead.`);
      transport = getRpcTransport(chainId as AnyChainId, "default");
    } else {
      transport = webSocket(wsUrl);

      isWsTransport = true;
    }
  } else if (normalizedOptions.withExpress) {
    transport = getRpcTransport(chainId as AnyChainId, "express");
  } else {
    transport = getRpcTransport(chainId as AnyChainId, "default");
  }

  const publicClient = createPublicClient({
    transport,
    chain: getViemChain(chainId),
  });

  PUBLIC_CLIENTS_CACHE.set(key, publicClient);

  if (isWsTransport) {
    setupWebSocketClientMetrics(publicClient, chainId);
  }

  return publicClient;
}

function setupWebSocketClientMetrics(publicClient: PublicClient, chainId: number) {
  (
    publicClient.transport as unknown as ReturnType<WebSocketTransport>["config"] &
      ReturnType<WebSocketTransport>["value"]
  )
    .getRpcClient()
    .then((client) => {
      const rpcUrl = client.url;
      const pushConnectedEvent = () => {
        metrics.pushEvent<ViemWsClientConnected>({
          event: "viemWsClient.connected",
          isError: false,
          data: {
            chainId,
            rpcUrl,
          },
        });
      };

      const pushDisconnectedEvent = () => {
        metrics.pushEvent<ViemWsClientDisconnected>({
          event: "viemWsClient.disconnected",
          isError: false,
          data: {
            chainId,
            rpcUrl,
          },
        });
      };

      const pushErrorEvent = () => {
        metrics.pushEvent<ViemWsClientError>({
          event: "viemWsClient.error",
          isError: true,
          data: {
            chainId,
            rpcUrl,
          },
        });
      };

      if (client.socket.OPEN) {
        pushConnectedEvent();
      } else {
        client.socket.addEventListener("open", pushConnectedEvent, { once: true });
      }

      if (client.socket.CLOSED) {
        pushDisconnectedEvent();
      } else {
        client.socket.addEventListener("close", pushDisconnectedEvent, { once: true });
      }

      client.socket.addEventListener("error", pushErrorEvent);
    });
}
