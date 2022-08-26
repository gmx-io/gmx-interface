import { ARBITRUM, AVALANCHE, MAINNET } from "./chainIds";

const alchemyWhitelistedDomains = ["gmx.io", "app.gmx.io"];

export function getDefaultArbitrumRpcUrl() {
  return "https://arb1.arbitrum.io/rpc";
}

export function getAlchemyHttpUrl() {
  if (alchemyWhitelistedDomains.includes(window.location.host)) {
    return "https://arb-mainnet.g.alchemy.com/v2/ha7CFsr1bx5ZItuR6VZBbhKozcKDY4LZ";
  }
  return "https://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export function getAlchemyWsUrl() {
  if (alchemyWhitelistedDomains.includes(window.location.host)) {
    return "wss://arb-mainnet.g.alchemy.com/v2/ha7CFsr1bx5ZItuR6VZBbhKozcKDY4LZ";
  }
  return "wss://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export const ARBITRUM_RPC_PROVIDERS = [getDefaultArbitrumRpcUrl()];

export const AVALANCHE_RPC_PROVIDERS = ["https://api.avax.network/ext/bc/C/rpc"];

// BSC TESTNET
// const RPC_PROVIDERS = [
//   "https://data-seed-prebsc-1-s1.binance.org:8545",
//   "https://data-seed-prebsc-2-s1.binance.org:8545",
//   "https://data-seed-prebsc-1-s2.binance.org:8545",
//   "https://data-seed-prebsc-2-s2.binance.org:8545",
//   "https://data-seed-prebsc-1-s3.binance.org:8545",
//   "https://data-seed-prebsc-2-s3.binance.org:8545"
// ]

export const BSC_RPC_PROVIDERS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed3.defibit.io",
  "https://bsc-dataseed4.defibit.io",
  "https://bsc-dataseed2.ninicoin.io",
  "https://bsc-dataseed3.ninicoin.io",
  "https://bsc-dataseed4.ninicoin.io",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

export const RPC_PROVIDERS = {
  [MAINNET]: BSC_RPC_PROVIDERS,
  [ARBITRUM]: ARBITRUM_RPC_PROVIDERS,
  [AVALANCHE]: AVALANCHE_RPC_PROVIDERS,
};

export const FALLBACK_PROVIDERS = {
  [ARBITRUM]: [getAlchemyHttpUrl()],
  [AVALANCHE]: ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"],
};
