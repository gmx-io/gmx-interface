import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import type { ClosingPoolsNotice as ClosingPoolsNoticeData } from "domain/synthetics/markets/closingPoolsNotices";
import { getClosingPoolOrdersUrl } from "domain/synthetics/orders/useViewClosingPoolOrdersByQueryParams";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

export function ClosingPoolsNotice({ notice, onClose }: { notice: ClosingPoolsNoticeData; onClose: () => void }) {
  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="warning"
      headerLabel={notice.title}
      headerIcon="alert"
      truncateHeader={false}
      onClose={onClose}
    >
      <div className="flex flex-col gap-12">
        {notice.bodyText && <div>{notice.bodyText}</div>}
        {notice.ordersCount > 0 && (
          <ColorfulBanner color="yellow">
            <span className="font-medium">{notice.ordersLeadText}</span> {notice.ordersActionText}{" "}
            <Link
              className="font-medium"
              to={getClosingPoolOrdersUrl(notice.ordersMarketAddresses)}
              onClick={onClose}
              data-qa="closing-pools-notice-view-orders"
            >
              <Trans>View orders</Trans>
            </Link>
          </ColorfulBanner>
        )}
      </div>
    </AnnouncementBanner>
  );
}
