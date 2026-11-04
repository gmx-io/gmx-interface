import cx from "classnames";
import { ReactNode } from "react";

import CheckIcon from "img/ic_check.svg?react";
import MinusIcon from "img/ic_minus.svg?react";

type Props = {
  isChecked?: boolean;
  setIsChecked?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  asRow?: boolean;
  isPartialChecked?: boolean;
  qa?: string;
  // Needed when there are no children: the box alone has no name for screen readers
  "aria-label"?: string;
};

type CheckboxBoxProps = {
  isChecked?: boolean;
  isPartialChecked?: boolean;
  disabled?: boolean;
};

/**
 * The box alone, for a control that already is a checkbox (e.g. a Button with role="checkbox").
 * The after: layer is a 24 × 24 click area centered on the 14px box.
 */
export function CheckboxBox({ isChecked, isPartialChecked, disabled }: CheckboxBoxProps) {
  return (
    <span
      className={cx(
        `text-body-medium relative flex h-14 w-14 shrink-0 items-center justify-center rounded-4 border
        border-textIcon-secondary after:absolute after:left-1/2 after:top-1/2 after:size-24 after:-translate-x-1/2
        after:-translate-y-1/2 after:content-[''] group-hover:group-enabled:border-stroke-accent`,
        {
          "opacity-50": disabled,
          "border-none bg-button-primary text-textIcon-onButton forced-colors:border-solid":
            isChecked || isPartialChecked,
        }
      )}
    >
      {isChecked && !isPartialChecked && <CheckIcon aria-hidden className="size-11" />}
      {isPartialChecked && <MinusIcon aria-hidden className="size-11" />}
    </span>
  );
}

export default function Checkbox(props: Props) {
  const { isChecked, setIsChecked, disabled, className, asRow, isPartialChecked } = props;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isPartialChecked ? "mixed" : Boolean(isChecked)}
      aria-label={props["aria-label"]}
      className={cx(
        `group flex items-center gap-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-blue-strong`,
        { disabled, selected: isChecked, fullRow: asRow, noLabel: !props.children },
        className
      )}
      onClick={(event) => {
        setIsChecked?.(!isChecked);
        event.stopPropagation();
      }}
      disabled={disabled}
      data-qa={props.qa}
    >
      <CheckboxBox isChecked={isChecked} isPartialChecked={isPartialChecked} disabled={disabled} />
      {props.children && props.children}
    </button>
  );
}
