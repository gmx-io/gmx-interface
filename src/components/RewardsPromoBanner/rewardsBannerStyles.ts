import type { CSSProperties } from "react";

import rewardsBannerBackground from "img/bg_rewards_banner.png";

export const rewardsBannerStyles = {
  backgroundImage: `url(${rewardsBannerBackground})`,
  backgroundPosition: "center",
  backgroundSize: "cover",
} satisfies CSSProperties;
