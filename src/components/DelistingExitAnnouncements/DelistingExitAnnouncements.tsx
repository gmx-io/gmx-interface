import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
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

import { DelistingToast, getActiveDelistingAnnouncements, writeDismissal } from "./delistingExitAnnouncementsLogic";

const SLOT_ID = "delisting-announcements-slot";

// This component is rendered inside every SyntheticsStateContextProvider, and several can be mounted
// at once (e.g. the GMX Account modal over a page). They all portal into the same slot, so only the
// first-mounted instance is allowed to render — the rest stay null to avoid duplicate banners.
const mountedTokens: symbol[] = [];
const singletonListeners = new Set<() => void>();

function subscribeSingleton(listener: () => void) {
  singletonListeners.add(listener);
  return () => {
    singletonListeners.delete(listener);
  };
}

function emitSingletonChange() {
  for (const listener of singletonListeners) {
    listener();
  }
}

function useIsPrimaryInstance(): boolean {
  const tokenRef = useRef<symbol | null>(null);
  if (tokenRef.current === null) {
    tokenRef.current = Symbol("delisting-announcements");
  }

  useEffect(() => {
    const token = tokenRef.current!;
    mountedTokens.push(token);
    emitSingletonChange();
    return () => {
      const index = mountedTokens.indexOf(token);
      if (index !== -1) {
        mountedTokens.splice(index, 1);
      }
      emitSingletonChange();
    };
  }, []);

  return useSyncExternalStore(
    subscribeSingleton,
    () => mountedTokens[0] === tokenRef.current,
    () => false
  );
}

export function DelistingExitAnnouncements() {
  const chainId = useSelector(selectChainId);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const pageType = useSelector(selectPageType);
  const isPrimary = useIsPrimaryInstance();
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);

  const handleDismiss = useCallback((item: DelistingToast) => {
    writeDismissal(item.id, item.markets, Date.now());
    forceRerender();
  }, []);

  const toShow = getActiveDelistingAnnouncements({
    chainId,
    positionsInfoData,
    depositMarketTokensData,
    marketsInfoData,
    now: Date.now(),
  });

  // The account page loads positions/balances for the viewed address, not the connected wallet.
  if (!isPrimary || pageType === "accounts" || toShow.length === 0 || !slot) {
    return null;
  }

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
