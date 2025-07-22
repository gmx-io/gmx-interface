import cx from "classnames";
import { ReactNode } from "react";
import { BsCheck } from "react-icons/bs";
import { TiMinus } from "react-icons/ti";

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
      className={cx(
        "group flex items-center gap-8 text-slate-100 hover:text-slate-400",
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
          `flex h-14  w-14
       items-center justify-center rounded-4 border border-slate-100 group-hover:border-slate-400`,
          {
            "opacity-50": disabled,
            "border-none bg-blue-400 text-white": isChecked || isPartialChecked,
          }
        )}
      >
        {isChecked && !isPartialChecked && <BsCheck />}
        {isPartialChecked && <TiMinus />}
      </span>
      {props.children && props.children}
    </div>
  );
}
