import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import { homeEventsData, appEventsData } from "config/events";
import { useEffect, useMemo, useState } from "react";
import EventToast from "./EventToast";
import { isFuture, parse } from "date-fns";
import { isHomeSite } from "lib/legacy";
import { useChainId } from "lib/chains";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { ARBITRUM } from "config/chains";
import { getProvider } from "lib/rpc";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage<string[]>("visited-announcements", []);
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const incentiveStats = useIncentiveStats(ARBITRUM);

  const [isArbitrumDown, setIsArbitrumDown] = useState(false);

  useEffect(() => {
    if (chainId !== ARBITRUM) {
      return;
    }

    async function helper() {
      const provider = getProvider(undefined, chainId);
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      const now = Date.now() / 1000;

      if (!block) return;

      if (now - block.timestamp > 60) {
        setIsArbitrumDown(true);
      }
    }

    helper();
  }, [setIsArbitrumDown, chainId]);

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

  useEffect(() => {
    const allIncentivesOn = Boolean(incentiveStats?.lp?.isActive && incentiveStats?.trading?.isActive);
    const someIncentivesOn =
      !allIncentivesOn && Boolean(incentiveStats?.lp?.isActive || incentiveStats?.trading?.isActive);
    const validationParams = {
      "v2-adaptive-funding": isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-coming-soon":
        isAdaptiveFundingActiveSomeMarkets !== undefined && !isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-all-markets": isAdaptiveFundingActiveAllMarkets,
      "incentives-launch": someIncentivesOn,
      "all-incentives-launch": allIncentivesOn,
      "arbitrum-issue": isArbitrumDown,
    };
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) => event.isActive)
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
    incentiveStats,
    isArbitrumDown,
  ]);
}

export default useEventToast;
