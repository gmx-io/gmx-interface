import cx from "classnames";
import { useCallback, type ReactNode } from "react";

type Props = {
  isChecked: boolean | undefined;
  setIsChecked: (value: boolean) => void;
  className?: string;
  textClassName?: string;
  children?: ReactNode;
  beforeSwitchContent?: ReactNode;
  disabled?: boolean;
};

export default function ToggleSwitch({
  isChecked,
  setIsChecked,
  className,
  disabled,
  children,
  textClassName,
  beforeSwitchContent,
}: Props) {
  const handleToggle = useCallback(() => {
    if (disabled) {
      return;
    }

    setIsChecked(!isChecked);
  }, [disabled, isChecked, setIsChecked]);

  return (
    <div className={cx("inline-flex w-full items-center justify-between gap-8", className)}>
      <span className={textClassName}>{children}</span>
      <div className="flex items-center gap-8">
        {beforeSwitchContent}
        <div
          className={cx("group relative w-36 cursor-pointer rounded-full border transition-all duration-300", {
            "border-blue-400 bg-blue-400": isChecked,
            "bg-fill-slate-700 border-slate-600": !isChecked,
            "pointer-events-none": disabled,
          })}
          onClick={handleToggle}
        >
          <div
            className={cx("h-18 w-18 rounded-full shadow-[0px_2px_4px_0px_#00000040] transition-all duration-300", {
              "translate-x bg-slate-100 opacity-60 group-hover:opacity-100": !isChecked,
              "translate-x-[17px] bg-white": isChecked,
            })}
          />
        </div>
      </div>
    </div>
  );
}
