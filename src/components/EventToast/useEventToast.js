import { useLocalStorage } from "react-use";
import toast from "react-hot-toast";
import eventsData from "../../config/events";
import { useEffect } from "react";
import EventToast from "./EventToast";

function useEventToast() {
  const [visited, setVisited] = useLocalStorage("visited-announcements", []);

  useEffect(() => {
    eventsData
      .filter(event => event.isActive)
      .filter(event => Array.isArray(visited) && !visited.includes(event.id))
      .forEach(event => {
        toast(
          () => (
            <EventToast
              event={event}
              id={event.id}
              onClick={() => {
                toast.dismiss(event.id);
                visited.push(event.id);
                setVisited(visited);
              }}
            />
          ),
          {
            id: event.id
          }
        );
      });
  }, [visited, setVisited]);
}

export default useEventToast;
