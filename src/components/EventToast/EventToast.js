import "./EventToast.css";
import Icon from "./AnnouncementIcon";
import { MdOutlineClose } from "react-icons/md";

export default function EventToast({ event, id, onClick }) {
  return (
    <div className="" key={id}>
      <header>
        <div className="title-info">
          <Icon className="announcement-icon" />
          <p>{event.title}</p>
        </div>
        <MdOutlineClose onClick={onClick} className="cross" color="white" />
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
