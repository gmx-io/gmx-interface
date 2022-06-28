import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import eventsData from "../../config/events";
import { useEffect } from "react";
import EventToast from "./EventToast";
import { isFuture, parse } from "date-fns";
import { isHomeSite } from "../../Helpers";

function useEventToast() {
  const isHome = isHomeSite();
  const [visited, setVisited] = useLocalStorage("visited-announcements", []);

  useEffect(() => {
    if (isHome) {
      return;
    }

    eventsData
      .filter((event) => event.isActive)
      .filter((event) => isFuture(parse(event.validTill + ", +00", "d MMM yyyy, H:mm, x", new Date())))
      .filter((event) => Array.isArray(visited) && !visited.includes(event.id))
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
  }, [visited, setVisited, isHome]);
}

export default useEventToast;
