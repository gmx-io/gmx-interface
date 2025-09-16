import { isFuture, parse } from "date-fns";
import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useLocalStorage } from "react-use";

import { ARBITRUM } from "config/chains";
import { appEventsData, homeEventsData, MKR_USD_DELISTING_EVENT_ID } from "config/events";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import EventToast from "./EventToast";

const MKR_USD_MARKET_ADDRESS = "0x2aE5c5Cd4843cf588AA8D1289894318130acc823";

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

  const { account } = useWallet();

  const positions = usePositions(chainId, {
    marketsData: marketsInfoData,
    tokensData: tokensData,
    account: account,
  });

  useEffect(() => {
    const someIncentivesOn = Boolean(arbIncentiveStats?.lp?.isActive || arbIncentiveStats?.trading?.isActive);
    const validationParams = {
      "v2-adaptive-funding": isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-coming-soon":
        isAdaptiveFundingActiveSomeMarkets !== undefined && !isAdaptiveFundingActiveSomeMarkets,
      "v2-adaptive-funding-all-markets": isAdaptiveFundingActiveAllMarkets,
      "arbitrum-incentives-launch-2": someIncentivesOn,
    };
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) =>
        event.id == MKR_USD_DELISTING_EVENT_ID
          ? Object.values(positions.positionsData ?? {}).some(
              (position) => position.marketAddress === MKR_USD_MARKET_ADDRESS
            )
          : true
      )
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
    arbIncentiveStats,
    positions.positionsData,
  ]);
}

export default useEventToast;
