import type { CSSProperties } from "react";

/**
 * Glow anchored to the bottom-right corner, behind the coin art. Absolute sizes keep the
 * shape identical on banners of any width.
 */
const GLOW = "520px 168px at calc(100% - 20px) 90%";

export type RewardsBannerAccent = "stakeGmx" | "stakeEsGmx" | "restake" | "bonus" | "referral" | "boost" | "tier";

export const rewardsBannerAccentStyles = {
  stakeGmx: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(45, 66, 252, 0.38) 0%, rgba(45, 66, 252, 0.1) 42%, rgba(45, 66, 252, 0) 68%)`,
  },
  stakeEsGmx: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(120, 133, 255, 0.34) 0%, rgba(120, 133, 255, 0.09) 42%, rgba(120, 133, 255, 0) 68%)`,
  },
  restake: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(78, 9, 248, 0.4) 0%, rgba(78, 9, 248, 0.11) 42%, rgba(78, 9, 248, 0) 68%)`,
  },
  bonus: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(3, 209, 207, 0.22) 0%, rgba(3, 209, 207, 0.06) 42%, rgba(3, 209, 207, 0) 68%)`,
  },
  referral: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(120, 133, 255, 0.3) 0%, rgba(45, 66, 252, 0.1) 42%, rgba(45, 66, 252, 0) 68%)`,
  },
  boost: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(78, 9, 248, 0.42) 0%, rgba(99, 71, 252, 0.26) 21%, rgba(120, 133, 255, 0.1) 42%, rgba(120, 133, 255, 0) 68%)`,
  },
  tier: {
    backgroundImage: `radial-gradient(${GLOW}, rgba(45, 66, 252, 0.3) 0%, rgba(45, 66, 252, 0.08) 42%, rgba(45, 66, 252, 0) 68%)`,
  },
} satisfies Record<RewardsBannerAccent, CSSProperties>;
