import rewardsBannerArtBonus from "img/rewards_banner_art_bonus.png";
import rewardsBannerArtReferral from "img/rewards_banner_art_referral.png";
import rewardsBannerArtStake from "img/rewards_banner_art_stake.png";
import rewardsBannerArtTier from "img/rewards_banner_art_tier.png";
import rewardsBannerCoinTrade from "img/rewards_banner_coin_trade.png";

export type RewardsBannerArtKey = "bonus" | "stake" | "referral" | "tier" | "trade";

/**
 * The illustrations are cropped to their content and have different proportions, so each one is
 * sized by height and anchored to the bottom-right corner instead of sharing a single square box.
 * Heights are picked so the art clears the close button on a 110px tall banner.
 */
export const rewardsBannerArt = {
  bonus: { src: rewardsBannerArtBonus, className: "bottom-[-6px] right-4 h-[88px]" },
  stake: { src: rewardsBannerArtStake, className: "bottom-[-6px] right-0 h-[84px]" },
  referral: { src: rewardsBannerArtReferral, className: "bottom-[-6px] right-0 h-[86px]" },
  tier: { src: rewardsBannerArtTier, className: "bottom-[-6px] right-0 h-[80px]" },
  trade: {
    src: rewardsBannerCoinTrade,
    className:
      "bottom-[-30px] right-[-12px] size-[126px] max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]",
  },
} satisfies Record<RewardsBannerArtKey, { src: string; className: string }>;
