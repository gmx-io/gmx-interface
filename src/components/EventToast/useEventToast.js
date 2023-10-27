import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import { homeEventsData, appEventsData } from "config/events";
import { useEffect } from "react";
import EventToast from "./EventToast";
import { isFuture, parse } from "date-fns";
import { isHomeSite } from "lib/legacy";
import { useChainId } from "lib/chains";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage("visited-announcements", []);
  const { chainId } = useChainId();

  useEffect(() => {
    const eventsData = isHome ? homeEventsData : appEventsData;

    eventsData
      .filter((event) => {
        const isValid = event.isActive && isFuture(parse(event.validTill + ", +00", "d MMM yyyy, H:mm, x", new Date()));
        const hasNotVisited = Array.isArray(visited) && !visited.includes(event.id);
        const isNetworkValid = !event.networks || event.networks.includes(chainId);
        return isValid && hasNotVisited && isNetworkValid;
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
              }}
            />
          ),
          {
            id: event.id,
            style: {},
          }
        );
      });
  }, [visited, setVisited, isHome, chainId]);
}

export default useEventToast;
