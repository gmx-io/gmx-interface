import { useCallback } from "react";
import { Link } from "react-router-dom";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { DelistingToast } from "./delistingExitAnnouncementsLogic";

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
    >
      {item.link ? (
        <>
          {item.bodyText}
          <br />
          <br />
          <Link to={item.link.href}>{item.link.text}</Link>
        </>
      ) : (
        item.bodyText
      )}
    </AnnouncementBanner>
  );
}
