import { useMemo } from "react";
import { Link } from "react-router-dom";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import {
  USDG_POOLS_ANNOUNCEMENT_EVENT_ID,
  USDG_POOLS_ANNOUNCEMENT_TITLE,
  USDG_POOLS_LINK_TEXT,
  USDG_POOLS_URL,
} from "./usdgPoolsAnnouncementEvent";

const READ_MORE_URL = `/announcements?id=${USDG_POOLS_ANNOUNCEMENT_EVENT_ID}`;

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
      Your address is whitelisted for the USDG line, GMX&apos;s new flagship for LPs. Deposits earn boosted APR on top
      of trading fees.{" "}
      <Link to={READ_MORE_URL} className="font-medium" onClick={onDismiss}>
        Read more
      </Link>
      .
    </AnnouncementBanner>
  );
}
