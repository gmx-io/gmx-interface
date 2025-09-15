import "./EventToast.css";
import { Toast } from "react-hot-toast";
import { RxCross2 } from "react-icons/rx";

import { EventData } from "config/events";

import ExternalLink from "components/ExternalLink/ExternalLink";

import MessageIcon from "img/ic_message.svg?react";

export default function EventToast({
  event,
  id,
  onClick,
  toast,
}: {
  event: EventData;
  id: string;
  onClick: () => void;
  toast: Toast;
}) {
  return (
    <div data-qa="toast" className={`single-toast text-body-medium ${toast.visible ? "zoomIn" : "zoomOut"}`} key={id}>
      <header>
        <div className="flex items-center gap-8">
          <MessageIcon className="size-20 shrink-0 text-blue-300" />
          <p className="font-medium">{event.title}</p>
        </div>
        <RxCross2
          onClick={onClick}
          className="size-20 shrink-0 cursor-pointer text-typography-secondary hover:text-typography-primary"
          data-qa="close-toast"
        />
      </header>
      {Array.isArray(event.bodyText) ? (
        event.bodyText.map((text, i) =>
          text === "" ? (
            <br key={i} />
          ) : (
            <p key={i} className="toast-body">
              {text}
            </p>
          )
        )
      ) : (
        <p className="toast-body">{event.bodyText}</p>
      )}
      {event.link && (
        <div className="toast-links">
          <ExternalLink key={event.id + event.link.text} href={event.link.href} newTab={event.link?.newTab ?? false}>
            {event.link.text}
          </ExternalLink>
          .
        </div>
      )}
    </div>
  );
}
