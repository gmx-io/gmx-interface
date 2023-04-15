import "./ToggleSwitch.scss";
import { ReactNode } from "react";
import cx from "classnames";

type Props = {
  isChecked: boolean;
  setIsChecked: (value: boolean) => void;
  className?: string;
  children?: ReactNode;
};

export default function ToggleSwitch({ isChecked, setIsChecked, className, children }: Props) {
  const classNames = cx("Switch-toggle-wrapper", className);
  return (
    <div className={classNames}>
      {children}
      <div className={cx("Switch-toggle", { checked: isChecked })} onClick={() => setIsChecked(!isChecked)}>
        <div className="handle" />
      </div>
    </div>
  );
}
