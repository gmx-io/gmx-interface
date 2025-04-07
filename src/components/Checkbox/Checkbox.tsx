import cx from "classnames";
import React, { ReactNode } from "react";
import { ImCheckboxUnchecked, ImCheckboxChecked } from "react-icons/im";

import PartialCheckedIcon from "img/ic_partial_checked.svg?react";

import "./Checkbox.css";

type Props = {
  isChecked?: boolean;
  setIsChecked?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  asRow?: boolean;
  isPartialChecked?: boolean;
  qa?: string;
};

export default function Checkbox(props: Props) {
  const { isChecked, setIsChecked, disabled, className, asRow, isPartialChecked } = props;

  return (
    <div
      className={cx("Checkbox", { disabled, selected: isChecked, fullRow: asRow, noLabel: !props.children }, className)}
      onClick={(event) => {
        setIsChecked?.(!isChecked);
        event.stopPropagation();
      }}
      data-qa={props.qa}
    >
      <span className="Checkbox-icon-wrapper">
        {isPartialChecked && <PartialCheckedIcon className="App-icon Checkbox-icon" />}
        {isChecked && !isPartialChecked && <ImCheckboxChecked className="App-icon Checkbox-icon active" />}
        {!isChecked && !isPartialChecked && <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />}
      </span>
      {props.children && <span className="Checkbox-label">{props.children}</span>}
    </div>
  );
}
