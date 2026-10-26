import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { ClosingPoolsLpNotice } from "./closingPoolsLpNoticeLogic";

export function ClosingPoolsLpNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: ClosingPoolsLpNotice;
  onDismiss: () => void;
}) {
  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="warning"
      headerLabel={notice.title}
      headerIcon="alert"
      truncateHeader={false}
      onClose={onDismiss}
    >
      {notice.body}{" "}
      <Link className="font-medium" to="/pools" onClick={onDismiss}>
        <Trans>View pools</Trans>
      </Link>
    </AnnouncementBanner>
  );
}
