import { useMemo } from "react";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import {
  USDG_POOLS_ANNOUNCEMENT_TITLE,
  USDG_POOLS_LINK_TEXT,
  USDG_POOLS_URL,
  getUsdgPoolsAnnouncementText,
} from "./usdgPoolsAnnouncementEvent";

export function UsdgPoolsAnnouncement({ onDismiss }: { onDismiss: () => void }) {
  const poolsLink = useMemo(
    () => ({ text: USDG_POOLS_LINK_TEXT, to: USDG_POOLS_URL, onClick: onDismiss }),
    [onDismiss]
  );

  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="info"
      headerLabel={USDG_POOLS_ANNOUNCEMENT_TITLE}
      headerIcon="info"
      truncateHeader={false}
      onClose={onDismiss}
      footerLink={poolsLink}
    >
      {getUsdgPoolsAnnouncementText(Date.now(), "flex flex-col gap-8")}
    </AnnouncementBanner>
  );
}
