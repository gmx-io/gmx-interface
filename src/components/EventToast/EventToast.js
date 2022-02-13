import { helperToast } from "../../Helpers";
import "./EventToast.css";
import Icon from "./AnnouncementIcon";

function EventPopupUI() {
  return (
    <div className="">
      <header>
        <Icon className="announcement-icon" />
        <p>New wETH bond</p>
      </header>
      <p className="toast-body">New WETH bond is now live on OlympusPro.</p>
      <div className="event-links">
        <a href="">Buy Now</a>
        <a href="">Learn more</a>
      </div>
    </div>
  );
}
export function showEventPopup() {
  helperToast.success(<EventPopupUI />, {
    position: "top-right",
    autoClose: false,
    className: `event-popup-container`,
    toastId: "event",
    containerId: "event"
  });
}

export default EventPopupUI;
