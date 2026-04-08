import { ARBITRUM, AVALANCHE, MEGAETH } from "config/chains";

export const PRODUCTION_HOST = "https://app.gmx.io";
export const JUMPER_EXCHANGE_URL = "https://jumper.exchange/";

export function getExternalAggregatorSwapUrlFromAddresses(chainId: number, fromAddress?: string, toAddress?: string) {
  if (MEGAETH === chainId) {
    return JUMPER_EXCHANGE_URL;
  }

  const addressesStr = [fromAddress, toAddress].filter(Boolean).join("/");
  return `https://app.1inch.io/#/${chainId}/simple/swap/${addressesStr}`;
}

export const JUMPER_BRIDGE_URL = "https://jumper.exchange/";

export const DOCS_LINKS = {
  fundingFees: "https://docs.gmx.io/docs/trading/fees/#funding-fees",
  borrowingFees: "https://docs.gmx.io/docs/trading/fees/#borrow-fees",
  priceImpact: "https://docs.gmx.io/docs/trading/fees/#price-impact-and-price-impact-rebates",
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

export const GMX_DISCORD_URL = "https://discord.gg/H5PeQru3Aa";
export const FEE_STRUCTURE_URL = "https://docs.gmx.io/docs/trading/fees-and-pricing/";
export const REFERRALS_DOCS_URL = "https://docs.gmx.io/docs/referrals/";

export const REFERRALS_DOCS_SECTION_LINKS = {
  howItWorks: "https://docs.gmx.io/docs/referrals#how-it-works",
  claimingRewards: "https://docs.gmx.io/docs/referrals#claiming-rewards",
  tiers: "https://docs.gmx.io/docs/referrals#tiers",
  transferringReferralCode: "https://docs.gmx.io/docs/referrals#transferring-a-referral-code",
} as const;

export const GMX_PARTNER_TELEGRAM_URL = "https://t.me/GMXPartners";
