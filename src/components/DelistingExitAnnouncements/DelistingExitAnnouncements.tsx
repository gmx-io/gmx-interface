import { useCallback, useReducer } from "react";
import { Link } from "react-router-dom";

import {
  selectChainId,
  selectDepositMarketTokensData,
  selectMarketsInfoData,
  selectPageType,
  selectPositionsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { DelistingToast, getDelistingAnnouncementActions, writeDismissal } from "./delistingExitAnnouncementsLogic";

export function DelistingExitAnnouncements() {
  const chainId = useSelector(selectChainId);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const pageType = useSelector(selectPageType);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const handleDismiss = useCallback((item: DelistingToast) => {
    writeDismissal(item.id, item.markets, Date.now());
    forceRerender();
  }, []);

  const { toShow } = getDelistingAnnouncementActions({
    chainId,
    positionsInfoData,
    depositMarketTokensData,
    marketsInfoData,
    now: Date.now(),
  });

  // The account page loads positions/balances for the viewed address, not the connected wallet.
  if (pageType === "accounts" || toShow.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-[23px] top-[56px] z-[801]" data-qa="delisting-announcements">
      <div className="flex w-[400px] max-w-[calc(100vw-46px)] flex-col gap-12">
        {toShow.map((item) => (
          <DelistingBanner key={item.id} item={item} onDismiss={handleDismiss} />
        ))}
      </div>
    </div>
  );
}

function DelistingBanner({ item, onDismiss }: { item: DelistingToast; onDismiss: (item: DelistingToast) => void }) {
  const handleClose = useCallback(() => onDismiss(item), [item, onDismiss]);

  return (
    <AnnouncementBanner
      className="pointer-events-auto"
      variant="warning"
      headerLabel={item.title}
      headerIcon="alert"
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
