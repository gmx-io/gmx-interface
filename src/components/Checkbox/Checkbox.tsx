import cx from "classnames";
import { ReactNode } from "react";
import { TiMinus } from "react-icons/ti";

import CheckIcon from "img/ic_check.svg?react";

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
    <button
      className={cx(
        "group flex items-center gap-8",
        { disabled, selected: isChecked, fullRow: asRow, noLabel: !props.children },
        className
      )}
      onClick={(event) => {
        setIsChecked?.(!isChecked);
        event.stopPropagation();
      }}
      data-qa={props.qa}
    >
      <span
        className={cx(
          `flex h-14 w-14 items-center justify-center rounded-4 border
          border-slate-100 text-14 group-hover:border-slate-400`,
          {
            "opacity-50": disabled,
            "border-none bg-blue-400 text-white": isChecked || isPartialChecked,
          }
        )}
      >
        {isChecked && !isPartialChecked && <CheckIcon className="size-14" />}
        {isPartialChecked && <TiMinus className="size-10" />}
      </span>
      {props.children && props.children}
    </button>
  );
}
