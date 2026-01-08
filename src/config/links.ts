import { ARBITRUM, AVALANCHE } from "config/chains";
import { TOKENS_BY_SYMBOL_MAP } from "sdk/configs/tokens";

export const PRODUCTION_HOST = "https://app.gmx.io";

const oneInchTokensMap = {
  [ARBITRUM]: {
    BTC: "WBTC",
  },
  [AVALANCHE]: {
    BTC: "BTC.b",
    ETH: "WETH.e",
    WBTC: "WBTC.e",
  },
};

export function get1InchSwapUrl(chainId: number, from?: string, to?: string) {
  const rootUrl = `https://app.1inch.io/#/${chainId}/simple/swap`;
  const chainTokensMap = TOKENS_BY_SYMBOL_MAP[chainId];
  const isInvalidInput = !from || !to || !chainTokensMap[from] || !chainTokensMap[to];
  if (isInvalidInput) {
    return rootUrl;
  }
  const fromToken = oneInchTokensMap[chainId]?.[from] || from;
  const toToken = oneInchTokensMap[chainId]?.[to] || to;
  return `${rootUrl}/${fromToken}/${toToken}`;
}

export function get1InchSwapUrlFromAddresses(chainId: number, fromAddress?: string, toAddress?: string) {
  const addressesStr = [fromAddress, toAddress].filter(Boolean).join("/");
  return `https://app.1inch.io/#/${chainId}/simple/swap/${addressesStr}`;
}

export function getLeaderboardLink(chainId) {
  if (chainId === ARBITRUM) {
    return "https://www.gmx.house/arbitrum/leaderboard";
  }
  if (chainId === AVALANCHE) {
    return "https://www.gmx.house/avalanche/leaderboard";
  }
  return "https://www.gmx.house";
}

export const DOCS_LINKS = {
  multiplierPoints: "https://docs.gmx.io/docs/tokenomics/rewards/#multiplier-points",
  fundingFees: "https://docs.gmx.io/docs/trading/#funding-fees",
  adaptiveFunding: "https://docs.gmx.io/docs/trading/#adaptive-funding",
  borrowingFees: "https://docs.gmx.io/docs/trading/#borrowing-fees",
  priceImpact: "https://docs.gmx.io/docs/trading#price-impact-and-price-impact-rebates",
};

export const ARBITRUM_INCENTIVES_V2_URL =
  "https://gmxio.notion.site/GMX-STIP-Bridge-Incentives-6967a56615b644eabc10f9a1a81b83ab";
export const AVALANCHE_INCENTIVES_V2_URL =
  "https://gmxio.notion.site/GMX-Summer-Boost-provide-liquidity-and-trade-perpetuals-to-grab-your-share-of-AVAX-rewards-13638f2e28934460a242f72def4f7d36";

export function getIncentivesV2Url(chainId: number): string {
  if (chainId === ARBITRUM) {
    return ARBITRUM_INCENTIVES_V2_URL;
  }

  if (chainId === AVALANCHE) {
    return AVALANCHE_INCENTIVES_V2_URL;
  }

  return ARBITRUM_INCENTIVES_V2_URL;
}

export const GLP_REIMBURSEMENT_TERMS_URL =
  "https://gateway.pinata.cloud/ipfs/bafkreiemqapoduhh2j5spg7ndmkqdx2l5s2uloqqcv4egu5qiy5oiv4kaq";

export function getHomeUrl() {
  // Avoid importing isLocal from config/env to prevent circular dependency
  if (self.location.host?.includes("localhost")) {
    return "http://localhost:3010";
  }
  return "https://gmx.io";
}

export function getAppBaseUrl() {
  if (self.location.host?.includes("localhost")) {
    return "http://localhost:3011/#";
  }
  return PRODUCTION_HOST;
}

export function getRootShareApiUrl() {
  if (self.location.host?.includes("localhost")) {
    return "https://gmxs.vercel.app";
  }
  return "https://share.gmx.io";
}

export function getTradePageUrl() {
  if (self.location.host?.includes("localhost")) {
    return "http://localhost:3011/#/trade";
  }
  return PRODUCTION_HOST + "/#/trade";
}
