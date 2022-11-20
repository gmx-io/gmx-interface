import "./EventToast.css";
import Icon from "./AnnouncementIcon";
import { MdOutlineClose } from "react-icons/md";
import ExternalLink from "components/ExternalLink/ExternalLink";

export default function EventToast({ event, id, onClick, t }) {
  return (
    <div className={`single-toast ${t.visible ? "zoomIn" : "zoomOut"}`} key={id}>
      <header>
        <div className="toast-title">
          <Icon className="announcement-icon" />
          <p>{event.title}</p>
        </div>
        <MdOutlineClose onClick={onClick} className="cross-icon" color="white" />
      </header>
      {Array.isArray(event.bodyText) ? (
        event.bodyText.map((text, i) => (
          <p key={i} className="toast-body">
            {text}
          </p>
        ))
      ) : (
        <p className="toast-body">{event.bodyText}</p>
      )}
      <div className="toast-links">
        {event.buttons.map((button) => {
          if (button.newTab) {
            return (
              <ExternalLink key={event.id + button.text} href={button.link}>
                {button.text}
              </ExternalLink>
            );
          } else {
            return (
              <a key={event.id + button.text} href={button.link}>
                {button.text}
              </a>
            );
          }
        })}
      </div>
    </div>
  );
}
