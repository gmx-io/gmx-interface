import "./OneClickButton.scss";

import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickButton({ openSettings }: { openSettings: () => void }) {
  return (
    <div className="OneClickButton" onClick={openSettings}>
      <OneClickIcon className="OneClickButton-icon" />
    </div>
  );
}
