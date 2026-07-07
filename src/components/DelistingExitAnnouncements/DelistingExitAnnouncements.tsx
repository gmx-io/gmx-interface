import { useCallback, useEffect, useReducer, useState } from "react";
import { createPortal } from "react-dom";
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

const SLOT_ID = "delisting-announcements-slot";

export function DelistingExitAnnouncements() {
  const chainId = useSelector(selectChainId);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const pageType = useSelector(selectPageType);
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);

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
  if (pageType === "accounts" || toShow.length === 0 || !slot) {
    return null;
  }

  // Render inside the shared announcement stack so it doesn't overlap the app-event toasts.
  return createPortal(
    toShow.map((item) => (
      <div key={item.id} className="pb-12">
        <DelistingBanner item={item} onDismiss={handleDismiss} />
      </div>
    )),
    slot
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
