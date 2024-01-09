import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, MAINNET, OPTIMISM_MAINNET, SEPOLIA_TESTNET } from "./chains";

export const GMX_STATS_API_URL = "https://t3.finance/#/dashboard"; // TODO - launch stats api
export const TF_TV_DATAFEED_API = "https://t3-tv-datafeed.fly.dev";

const BACKEND_URLS = {
  default: "https://gmx-server-mainnet.uw.r.appspot.com",

  [MAINNET]: "https://gambit-server-staging.uc.r.appspot.com",
  [ARBITRUM_TESTNET]: "https://gambit-server-devnet.uc.r.appspot.com",
  [ARBITRUM]: "https://gmx-server-mainnet.uw.r.appspot.com",
  [AVALANCHE]: "https://gmx-avax-server.uc.r.appspot.com",
  [SEPOLIA_TESTNET]: "https://t3-trade-history-sepolia.fly.dev",
  [OPTIMISM_MAINNET] : "https://t3-trade-history-optimism.fly.dev",
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
