import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { DelistingToast } from "./delistingExitAnnouncementsLogic";
import { PERSONAL_DELISTING_ANNOUNCEMENT_ID } from "./personalDelistingAnnouncement";

const READ_MORE_LINK = {
  text: <Trans>Read more</Trans>,
  to: `/announcements?id=${encodeURIComponent(PERSONAL_DELISTING_ANNOUNCEMENT_ID)}`,
};

export function DelistingBanner({
  item,
  onDismiss,
}: {
  item: DelistingToast;
  onDismiss: (item: DelistingToast) => void;
}) {
  const handleClose = useCallback(() => onDismiss(item), [item, onDismiss]);

  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="error"
      headerLabel={item.title}
      headerIcon="alert"
      truncateHeader={false}
      onClose={handleClose}
      footerLink={READ_MORE_LINK}
    >
      {item.link ? (
        <>
          {item.bodyText}
          <br />
          <br />
          <Link className="font-medium" to={item.link.href}>
            {item.link.text}
          </Link>
        </>
      ) : (
        item.bodyText
      )}
    </AnnouncementBanner>
  );
}
