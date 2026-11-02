import { useMemo } from "react";

import { EventData } from "config/events";
import useWallet from "lib/wallets/useWallet";

import { getTargetedAnnouncementAddressHash } from "components/TargetedAnnouncement/targetedAnnouncementLogic";

import { USDG_POOLS_ANNOUNCEMENT_CAMPAIGN } from "./usdgPoolsAnnouncementCampaign";
import { getUsdgPoolsAnnouncementEvent } from "./usdgPoolsAnnouncementEvent";

export function useUsdgPoolsAnnouncementEvent(): EventData | undefined {
  const { account } = useWallet();

  return useMemo(() => {
    const now = Date.now();
    const accountHash = getTargetedAnnouncementAddressHash(account);
    const isListed = accountHash !== undefined && USDG_POOLS_ANNOUNCEMENT_CAMPAIGN.addressHashes.has(accountHash);

    if (!isListed || now >= USDG_POOLS_ANNOUNCEMENT_CAMPAIGN.endTimestamp) return undefined;

    return getUsdgPoolsAnnouncementEvent(now);
  }, [account]);
}
