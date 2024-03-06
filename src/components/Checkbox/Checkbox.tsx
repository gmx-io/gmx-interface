import React, { ReactNode } from "react";

import cx from "classnames";

import "./Checkbox.css";
import { ImCheckboxUnchecked, ImCheckboxChecked } from "react-icons/im";

type Props = {
  isChecked?: boolean;
  setIsChecked?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  asRow?: boolean;
};

export default function Checkbox(props: Props) {
  const { isChecked, setIsChecked, disabled, className, asRow } = props;

  return (
    <div
      className={cx("Checkbox", { disabled, selected: isChecked, fullRow: asRow }, className)}
      onClick={(event) => {
        setIsChecked?.(!isChecked);
        event.stopPropagation();
      }}
    >
      <span className="Checkbox-icon-wrapper">
        {isChecked && <ImCheckboxChecked className="App-icon Checkbox-icon active" />}
        {!isChecked && <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />}
      </span>
      <span className="Checkbox-label">{props.children}</span>
    </div>
  );
}
