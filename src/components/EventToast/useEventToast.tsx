import { isFuture, parse } from "date-fns";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useLocalStorage } from "react-use";

import { ARBITRUM } from "config/chains";
import { EventData, appEventsData, homeEventsData } from "config/events";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";

import EventToast from "./EventToast";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage<string[]>("visited-announcements", []);
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const arbIncentiveStats = useIncentiveStats(ARBITRUM);

  const isAdaptiveFundingActiveSomeMarkets = useMemo(() => {
    if (!marketsInfoData) return;
    return Object.values(marketsInfoData).some((market) => market.fundingIncreaseFactorPerSecond > 0);
  }, [marketsInfoData]);

  const isAdaptiveFundingActiveAllMarkets = useMemo(() => {
    if (!marketsInfoData) return;
    return Object.values(marketsInfoData)
      .filter((market) => !market.isSpotOnly)
      .every((market) => market.fundingIncreaseFactorPerSecond > 0);
  }, [marketsInfoData]);

  const { uiFlags } = useUiFlagsRequest();

  useEffect(() => {
    const someIncentivesOn = Boolean(arbIncentiveStats?.lp?.isActive || arbIncentiveStats?.trading?.isActive);
    const validationParams: Record<string, boolean | undefined> = {
      "v2-adaptive-funding": isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-coming-soon":
        isAdaptiveFundingActiveSomeMarkets !== undefined && !isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-all-markets": isAdaptiveFundingActiveAllMarkets,
      "arbitrum-incentives-launch-2": someIncentivesOn,
    };
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) => isEventActive(event, uiFlags))
      .filter(
        (event) => !event.startDate || !isFuture(parse(event.startDate + ", +00", "d MMM yyyy, H:mm, x", new Date()))
      )
      .filter((event) => isFuture(parse(event.endDate + ", +00", "d MMM yyyy, H:mm, x", new Date())))
      .filter((event) => Array.isArray(visited) && !visited.includes(event.id))
      .filter((event) => !event.chains || event.chains.includes(chainId))
      .filter((event) => !(event.id in validationParams) || validationParams[event.id])
      .forEach((event) => {
        toast.custom(
          (t) => (
            <EventToast
              event={event}
              id={event.id}
              toast={t}
              variant={event.variant}
              onClick={() => {
                toast.dismiss(event.id);
                const newVisited = visited ? [...visited, event.id] : [event.id];
                setVisited(newVisited);
              }}
            />
          ),
          {
            id: event.id,
            style: {},
          }
        );
      });
  }, [
    visited,
    setVisited,
    isHome,
    chainId,
    isAdaptiveFundingActiveSomeMarkets,
    isAdaptiveFundingActiveAllMarkets,
    arbIncentiveStats,
    uiFlags,
  ]);
}

function isEventActive(event: EventData, uiFlags: Record<string, boolean> | undefined): boolean {
  if (event.flagId !== undefined) {
    return uiFlags?.[event.flagId] === true;
  }

  return event.isActive === true;
}

export default useEventToast;
