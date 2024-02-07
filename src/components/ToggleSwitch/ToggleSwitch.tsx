import "./ToggleSwitch.scss";
import { ReactNode } from "react";
import cx from "classnames";

type Props = {
  isChecked: boolean;
  setIsChecked: (value: boolean) => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
};

export default function ToggleSwitch({ isChecked, setIsChecked, className, children, disabled }: Props) {
  const classNames = cx("Switch-toggle-wrapper", { "Switch-toggle-wrapper_disabled": disabled }, className);
  return (
    <div className={classNames}>
      {children}
      <div
        className={cx("Switch-toggle", { checked: isChecked })}
        onClick={disabled ? undefined : () => setIsChecked(!isChecked)}
      >
        <div className="handle" />
      </div>
    </div>
  );
}
