import "./EventToast.css";
import Icon from "./AnnouncementIcon";
import eventsData from "../../config/events";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useLocalStorage } from "react-use";

function EventPopupUI({ event }) {
  return (
    <div className="">
      <header>
        <Icon className="announcement-icon" />
        <p>{event.title}</p>
      </header>
      <p className="toast-body">{event.bodyText}</p>
      <div className="event-links">
        {event.buttons.map(button => (
          <a
            key={event.id + button.text}
            target="_blank"
            rel="noreferrer noopener"
            href={button.link}
          >
            {button.text}
          </a>
        ))}
      </div>
    </div>
  );
}

export function useEventToast() {
  const [value, setValue] = useLocalStorage("visited-announcements", []);
  useEffect(() => {
    eventsData
      .filter(event => event.isActive)
      .filter(event => !value.includes(event.id))
      .forEach(event => {
        toast.success(<EventPopupUI event={event} />, {
          position: "top-right",
          autoClose: false,
          className: `single-toast`,
          containerId: "event",
          toastId: event.id,
          onClose: () => {
            setValue(prev => [...prev, event.id]);
          }
        });
      });
  }, [setValue, value]);
}

export default useEventToast;
