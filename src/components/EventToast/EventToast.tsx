import "./EventToast.css";
import { Toast } from "react-hot-toast";

import { EventData } from "config/events";
import { UiFlagEventVariant } from "config/uiFlagEvents";

import ExternalLink from "components/ExternalLink/ExternalLink";

import AlertIcon from "img/ic_alert.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import MessageIcon from "img/ic_message.svg?react";

export default function EventToast({
  event,
  id,
  onClick,
  toast,
  variant = "info",
}: {
  event: EventData;
  id: string;
  onClick: () => void;
  toast: Toast;
  variant?: UiFlagEventVariant;
}) {
  const isWarning = variant === "warning";
  const Icon = isWarning ? AlertIcon : MessageIcon;
  const iconColorClass = isWarning ? "text-red-500" : "text-blue-300";
  const toastClass = isWarning ? "single-toast service-disruption" : "single-toast";

  return (
    <div data-qa="toast" className={`${toastClass} text-body-medium ${toast.visible ? "zoomIn" : "zoomOut"}`} key={id}>
      <header>
        <div className="flex items-center gap-8">
          <Icon className={`size-20 shrink-0 ${iconColorClass}`} />
          <p className="font-medium">{event.title}</p>
        </div>
        <CloseIcon
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
