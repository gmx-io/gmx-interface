import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  MEGAETH,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "sdk/configs/chainIds";

/**
 * Every endpoint in `config/rpc`'s `RPC_CONFIGS` / `WS_RPC_CONFIGS`, so a test interceptor can
 * recover the chain a request was meant for from its url alone.
 *
 * This is a hand-kept copy on purpose: the Playwright adapter runs in Playwright's plain Node
 * context, which cannot load `config/rpc` (it needs `import.meta.env` and Vite resolution).
 * `chainIdFromRpcUrl.spec.ts` diffs this table against the real config and fails on drift.
 *
 * Entries are bare hosts, except providers that multiplex chains by url path (`1rpc.io/bnb`,
 * `rpc.ankr.com/eth`, …) — those carry the path prefix that selects the chain. Api keys live in the
 * url path too, so bare-host matching keeps dev and production Alchemy keys pointing at the same
 * chain, while a path entry wins over a bare-host one for the same host.
 */
export const RPC_HOSTS_BY_CHAIN_ID: Record<number, string[]> = {
  [ARBITRUM]: [
    "arb1.arbitrum.io",
    "arbitrum-one-rpc.publicnode.com",
    "arbitrum-one.public.blastapi.io",
    "arb-mainnet.g.alchemy.com",
  ],
  [AVALANCHE]: ["api.avax.network", "avax-mainnet.g.alchemy.com"],
  [AVALANCHE_FUJI]: [
    "avalanche-fuji-c-chain.publicnode.com",
    "api.avax-test.network",
    "endpoints.omniatech.io/v1/avax/fuji",
    "ava-testnet.public.blastapi.io",
  ],
  [ARBITRUM_SEPOLIA]: [
    "sepolia-rollup.arbitrum.io",
    "arbitrum-sepolia.drpc.org",
    "arbitrum-sepolia-rpc.publicnode.com",
    "arb-sepolia.g.alchemy.com",
  ],
  [MEGAETH]: ["mainnet.megaeth.com", "megaeth-mainnet.g.alchemy.com"],
  [SOURCE_BASE_MAINNET]: ["mainnet.base.org", "base-rpc.publicnode.com", "base.drpc.org", "base-mainnet.g.alchemy.com"],
  [SOURCE_OPTIMISM_SEPOLIA]: [
    "sepolia.optimism.io",
    "optimism-sepolia.drpc.org",
    "optimism-sepolia.therpc.io",
    "opt-sepolia.g.alchemy.com",
  ],
  [SOURCE_SEPOLIA]: ["sepolia.drpc.org", "eth-sepolia.g.alchemy.com"],
  [SOURCE_BSC_MAINNET]: [
    "bsc-dataseed.bnbchain.org",
    "1rpc.io/bnb",
    "bsc.drpc.org",
    "bsc-rpc.publicnode.com",
    "bnb-mainnet.g.alchemy.com",
  ],
  [SOURCE_ETHEREUM_MAINNET]: [
    "rpc.ankr.com/eth",
    "eth.drpc.org",
    "ethereum.publicnode.com",
    "eth-mainnet.g.alchemy.com",
  ],
};

type ChainIdIndex = {
  byHost: Map<string, number>;
  byPath: { host: string; pathPrefix: string; chainId: number }[];
};

let index: ChainIdIndex | undefined;

function getIndex(): ChainIdIndex {
  if (index) {
    return index;
  }

  index = { byHost: new Map(), byPath: [] };

  for (const [chainId, entries] of Object.entries(RPC_HOSTS_BY_CHAIN_ID)) {
    for (const entry of entries) {
      const slash = entry.indexOf("/");
      if (slash === -1) {
        index.byHost.set(entry, Number(chainId));
      } else {
        index.byPath.push({ host: entry.slice(0, slash), pathPrefix: entry.slice(slash), chainId: Number(chainId) });
      }
    }
  }

  return index;
}

export function chainIdFromRpcUrl(url: URL | string): number | undefined {
  const { host, pathname } = typeof url === "string" ? new URL(url) : url;
  const { byHost, byPath } = getIndex();

  for (const entry of byPath) {
    if (entry.host === host && (pathname === entry.pathPrefix || pathname.startsWith(entry.pathPrefix + "/"))) {
      return entry.chainId;
    }
  }

  return byHost.get(host);
}
