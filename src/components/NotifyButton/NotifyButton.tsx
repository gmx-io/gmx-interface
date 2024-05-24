import { memo } from "react";
import { useNotifyModalState } from "lib/useNotifyModalState";

import "./NotifyButton.scss";

import { ReactComponent as BellIcon } from "img/bell.svg";

const NotifyButton = memo(function NotifyButton() {
  const { openNotifyModal } = useNotifyModalState();

  return (
    <div className="NotifyButton" onClick={openNotifyModal}>
      <BellIcon className="NotifyButton-icon" />
    </div>
  );
});

export default NotifyButton;
