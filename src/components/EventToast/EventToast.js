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
      {event.buttons && (
        <div className="toast-links">
          {event.buttons.map((button) => {
            const newTab = button.newTab ? true : false;
            return (
              <ExternalLink key={event.id + button.text} href={button.link} newTab={newTab}>
                {button.text}
              </ExternalLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
