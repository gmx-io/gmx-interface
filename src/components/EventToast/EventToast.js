import "./EventToast.css";
import Icon from "./AnnouncementIcon";
import { MdOutlineClose } from "react-icons/md";

export default function EventToast({ event, id, onClick }) {
  return (
    <div className="single-toast" key={id}>
      <header>
        <div className="toast-title">
          <Icon className="announcement-icon" />
          <p>{event.title}</p>
        </div>
        <MdOutlineClose
          onClick={onClick}
          className="cross-icon"
          color="white"
        />
      </header>
      <p className="toast-body">{event.bodyText}</p>
      <div className="toast-links">
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
