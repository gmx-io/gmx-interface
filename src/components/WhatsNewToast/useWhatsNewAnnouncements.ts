import { isFuture } from "date-fns";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "react-use";

import { EventData, appEventsData } from "config/events";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import { getEventSortDate, isEventActiveByFlag, parseEventDate } from "pages/Announcements/announcementsHelpers";

const VISITED_ANNOUNCEMENTS_KEY = "visited-announcements";
const MAX_TOAST_CARDS = 4;

type UseWhatsNewAnnouncementsResult = {
  cards: EventData[];
  dismiss: () => void;
};

export function useWhatsNewAnnouncements(): UseWhatsNewAnnouncementsResult {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage<string[]>(VISITED_ANNOUNCEMENTS_KEY, []);
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { account } = useWallet();
  const positions = usePositions(chainId, {
    marketsData: marketsInfoData,
    tokensData: tokensData,
    account,
  });
  const { uiFlags } = useUiFlagsRequest();

  const openPositionMarkets = useMemo(() => {
    const set = new Set<string>();
    for (const position of Object.values(positions.positionsData ?? {})) {
      set.add(position.marketAddress.toLowerCase());
    }
    return set;
  }, [positions.positionsData]);

  const eligible = useMemo<EventData[]>(() => {
    if (isHome) return [];
    const visitedSet = new Set(Array.isArray(visited) ? visited : []);

    const result = appEventsData.filter((event) => {
      if (!isEventActiveByFlag(event, uiFlags)) return false;
      if (event.startDate && isFuture(parseEventDate(event.startDate))) return false;
      if (!isFuture(parseEventDate(event.endDate))) return false;
      if (event.chains && !event.chains.includes(chainId)) return false;
      if (visitedSet.has(event.id)) return false;
      if (event.requiresOpenPosition && !openPositionMarkets.has(event.requiresOpenPosition.toLowerCase()))
        return false;
      return true;
    });

    result.sort((a, b) => {
      const aTime = getEventSortDate(a).getTime();
      const bTime = getEventSortDate(b).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    });

    return result;
  }, [isHome, visited, uiFlags, chainId, openPositionMarkets]);

  const cards = useMemo(() => eligible.slice(0, MAX_TOAST_CARDS), [eligible]);

  const dismiss = useCallback(() => {
    if (eligible.length === 0) return;
    const prev = Array.isArray(visited) ? visited : [];
    const next = Array.from(new Set([...prev, ...eligible.map((event) => event.id)]));
    setVisited(next);
  }, [eligible, setVisited, visited]);

  return { cards, dismiss };
}
