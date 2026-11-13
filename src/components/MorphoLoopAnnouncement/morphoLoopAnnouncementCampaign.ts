import { MORPHO_LOOP_ANNOUNCEMENT_DISMISSED_KEY } from "config/localStorage";

import { LazyTargetedAnnouncementCampaign } from "components/TargetedAnnouncement/targetedAnnouncementLogic";

import morphoLoopAnnouncementAddressHashesUrl from "./morphoLoopAnnouncementAddressHashes.json?url";

export const MORPHO_LOOP_ANNOUNCEMENT_CAMPAIGN: LazyTargetedAnnouncementCampaign = {
  flag: "showMorphoLoopAnnouncement",
  endTimestamp: Date.UTC(2026, 11, 1),
  dismissedKey: MORPHO_LOOP_ANNOUNCEMENT_DISMISSED_KEY,
  addressHashesUrl: morphoLoopAnnouncementAddressHashesUrl,
};
