import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import { homeEventsData, appEventsData } from "config/events";
import { useEffect, useMemo, useRef } from "react";
import EventToast from "./EventToast";
import { isFuture, parse } from "date-fns";
import { isHomeSite } from "lib/legacy";
import { useChainId } from "lib/chains";
import { useMarketsInfo } from "domain/synthetics/markets";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage("visited-announcements", []);
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const toastShownRef = useRef({});

  const isAdaptiveFundingActive = useMemo(() => {
    if (!marketsInfoData) return;
    return Object.values(marketsInfoData).some((market) => market.fundingIncreaseFactorPerSecond.gt(0));
  }, [marketsInfoData]);

  const validationParams = useMemo(
    () => ({
      "v2-adaptive-funding": isAdaptiveFundingActive,
    }),
    [isAdaptiveFundingActive]
  );

  useEffect(() => {
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) => {
        const isValid = event.isActive && isFuture(parse(event.validTill + ", +00", "d MMM yyyy, H:mm, x", new Date()));
        const hasNotVisited = Array.isArray(visited) && !visited.includes(event.id);
        const isNetworkValid = !event.networks || event.networks.includes(chainId);
        const isValidated = !event.validateCondition || validationParams[event.id];
        const hasNotShownToast = !toastShownRef.current[event.id];
        return isValid && hasNotVisited && isNetworkValid && isValidated && hasNotShownToast;
      })
      .forEach((event) => {
        toast.custom(
          (t) => (
            <EventToast
              event={event}
              id={event.id}
              t={t}
              onClick={() => {
                toast.dismiss(event.id);
                visited.push(event.id);
                setVisited(visited);
                toastShownRef.current[event.id] = true;
              }}
            />
          ),
          {
            id: event.id,
            style: {},
          }
        );
      });
  }, [visited, setVisited, isHome, chainId, validationParams]);
}

export default useEventToast;
