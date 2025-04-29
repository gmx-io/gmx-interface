import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  BLAST_SEPOLIA_TESTNET,
  MAINNET,
  MORPH_HOLESKY,
  MORPH_MAINNET,
  OPTIMISM_MAINNET,
  SEPOLIA_TESTNET,
  BASE_MAINNET,
} from "./chains";

export const GMX_STATS_API_URL = process.env.REACT_APP_STATS_API_URL || "https://stats.gmx.io/api"; // TODO - launch stats api
export const TF_TV_DATAFEED_API = process.env.REACT_APP_TV_DATAFEED_API || "https://t3-tv-datafeed.fly.dev";

const BACKEND_URLS = {
  default: "https://gmx-server-mainnet.uw.r.appspot.com",

  [MAINNET]: "https://gambit-server-staging.uc.r.appspot.com",
  [ARBITRUM_TESTNET]: "https://gambit-server-devnet.uc.r.appspot.com",
  [ARBITRUM]: "https://gmx-server-mainnet.uw.r.appspot.com",
  [AVALANCHE]: "https://gmx-avax-server.uc.r.appspot.com",
  [SEPOLIA_TESTNET]: "https://t3-trade-history-sepolia-jy22.onrender.com",
  [OPTIMISM_MAINNET]: "https://t3-trade-history-api.onrender.com",
  [BLAST_SEPOLIA_TESTNET]: "https://t3-trade-history-blast-sepolia-9dfi.onrender.com",
  [MORPH_HOLESKY]: "https://t3-trade-history-blast-sepolia-9dfi.onrender.com",
  [MORPH_MAINNET]: "https://t3-trade-history-api-morph-mainnet.onrender.com",
  [BASE_MAINNET]: "https://t3-trade-history-api-optimism-mainnet.onrender.com", // Note: this is correct, base is using repurposed optimism server
};

export function getServerBaseUrl(chainId: number) {
  if (!chainId) {
    throw new Error("chainId is not provided");
  }

  if (document.location.hostname.includes("deploy-preview")) {
    const fromLocalStorage = localStorage.getItem("SERVER_BASE_URL");
    if (fromLocalStorage) {
      return fromLocalStorage;
    }
  }

  return BACKEND_URLS[chainId] || BACKEND_URLS.default;
}

export function getServerUrl(chainId: number, path: string) {
  return `${getServerBaseUrl(chainId)}${path}`;
}
