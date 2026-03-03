import { ARBITRUM, AVALANCHE } from "config/chains";

export const PRODUCTION_HOST = "https://app.gmx.io";

export function get1InchSwapUrlFromAddresses(chainId: number, fromAddress?: string, toAddress?: string) {
  const addressesStr = [fromAddress, toAddress].filter(Boolean).join("/");
  return `https://app.1inch.io/#/${chainId}/simple/swap/${addressesStr}`;
}

export const DOCS_LINKS = {
  multiplierPoints: "https://docs.gmx.io/docs/tokenomics/rewards/#multiplier-points",
  fundingFees: "https://docs.gmx.io/docs/trading/#funding-fees",
  adaptiveFunding: "https://docs.gmx.io/docs/trading/#adaptive-funding",
  borrowingFees: "https://docs.gmx.io/docs/trading/#borrowing-fees",
  priceImpact: "https://docs.gmx.io/docs/trading/#price-impact-and-price-impact-rebates",
};

const ARBITRUM_INCENTIVES_V2_URL =
  "https://gmxio.notion.site/GMX-STIP-Bridge-Incentives-6967a56615b644eabc10f9a1a81b83ab";
const AVALANCHE_INCENTIVES_V2_URL =
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
