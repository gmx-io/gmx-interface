import { ARBITRUM } from "config/chains";
import { EventData } from "config/events";
import { PRODUCTION_HOST } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { USDG_POOLS_ANNOUNCEMENT_CAMPAIGN } from "./usdgPoolsAnnouncementCampaign";

export const USDG_POOLS_ANNOUNCEMENT_TITLE = "GMX is moving off 50/50 pools: boosted USDG product line is live";
export const USDG_POOLS_LINK_TEXT = "Deposit in GLV [USDG-USDG] or GM [USDG-USDG]";
export const USDG_POOLS_URL = `/pools?chainId=${ARBITRUM}`;

const FEE_FREE_WITHDRAWALS_END = Date.UTC(2026, 10, 1);
const LAUNCH_BOOST_RATE_END = Date.UTC(2026, 11, 1);

export function getUsdgPoolsAnnouncementText(now: number, className: string) {
  return (
    <span className={className}>
      <span>
        GMX is shifting its LP product focus from 50/50 pools to single-asset pools, with the new USDG line as the
        flagship. Trading volume will move there, and all new markets will launch there.
      </span>
      <span>
        The USDG line comes with a 20-week boost program on top of trading fees.
        {now < LAUNCH_BOOST_RATE_END &&
          " Until 30 November, 8%+ additional APR on GLV [USDG-USDG] and 5% on the underlying GM [USDG-USDG] pools."}{" "}
        This boost gradually tapers off from Week 9 to 20.
      </span>
      <span>Your address is whitelisted for direct GM [USDG-USDG] deposits and zero-fee USDC-to-USDG conversion.</span>
      {now < FEE_FREE_WITHDRAWALS_END && (
        <span>
          Withdrawals on the main 50/50 pools and the existing GLV vaults are fee-free until Oct 31, rolling out pool by
          pool. The withdrawal screen shows any fee before you confirm.
        </span>
      )}
      <span>
        GMX never DMs first or asks for signatures outside{" "}
        <ExternalLink href={PRODUCTION_HOST}>app.gmx.io</ExternalLink>.
      </span>
    </span>
  );
}

export function getUsdgPoolsAnnouncementEvent(now: number): EventData {
  return {
    id: "usdg-flagship-line",
    type: "update",
    flagId: USDG_POOLS_ANNOUNCEMENT_CAMPAIGN.flag,
    endDate: "01 Jan 2027, 00:00",
    chains: [ARBITRUM],
    title: USDG_POOLS_ANNOUNCEMENT_TITLE,
    description: getUsdgPoolsAnnouncementText(now, "flex flex-col gap-12"),
    link: { text: USDG_POOLS_LINK_TEXT, href: USDG_POOLS_URL },
  };
}
