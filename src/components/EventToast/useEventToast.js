import { useState } from "react";
import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import { homeEventsData, appEventsData } from "config/events";
import { useEffect, useMemo } from "react";
import EventToast from "./EventToast";
import { isFuture, parse } from "date-fns";
import { isHomeSite } from "lib/legacy";
import { useChainId } from "lib/chains";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { ARBITRUM } from "config/chains";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage("visited-announcements", []);
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const [isIncentivesActive, setIsIncentivesActive] = useState(false);

  const isAdaptiveFundingActive = useMemo(() => {
    if (!marketsInfoData) return;
    return Object.values(marketsInfoData).some((market) => market.fundingIncreaseFactorPerSecond.gt(0));
  }, [marketsInfoData]);

  const arbitrumOracleKeeperFetcher = useOracleKeeperFetcher(ARBITRUM);

  useEffect(() => {
    async function load() {
      const res = await arbitrumOracleKeeperFetcher.fetchIncentivesRewards();
      if (res && res.lp && res.lp.isActive) {
        setIsIncentivesActive(true);
      }
    }

    load();
  }, [arbitrumOracleKeeperFetcher]);

  useEffect(() => {
    const validationParams = {
      "v2-adaptive-funding": isAdaptiveFundingActive,
      "v2-adaptive-funding-coming-soon": isAdaptiveFundingActive !== undefined && !isAdaptiveFundingActive,
      "incentives-launch": isIncentivesActive,
    };
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) => event.isActive)
      .filter((event) => isFuture(parse(event.validTill + ", +00", "d MMM yyyy, H:mm, x", new Date())))
      .filter((event) => Array.isArray(visited) && !visited.includes(event.id))
      .filter((event) => !event.networks || event.chains.includes(chainId))
      .filter((event) => !(event.id in validationParams) || validationParams[event.id])
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
              }}
            />
          ),
          {
            id: event.id,
            style: {},
          }
        );
      });
  }, [visited, setVisited, isHome, chainId, isAdaptiveFundingActive, isIncentivesActive]);
}

export default useEventToast;
