import cx from "classnames";
import { useCallback, type ReactNode } from "react";

type Props = {
  isChecked: boolean;
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
    <div className={cx("inline-flex items-center justify-between w-full gap-8", className)}>
      <span className={textClassName}>{children}</span>
      <div className="flex items-center gap-8">
        {beforeSwitchContent}
        <div
          className={cx("w-36 border rounded-full transition-all duration-300 group cursor-pointer", {
            "bg-button-primary border-button-primary": isChecked,
            "bg-fill-surfaceElevated border-stroke-primary": !isChecked,
            "pointer-events-none": disabled,
          })}
          onClick={handleToggle}
        >
          <div
            className={cx("shadow-[0px_2px_4px_0px_#00000040] h-18 w-18 rounded-full transition-all duration-300", {
              "bg-textIcon-secondary opacity-60 group-hover:opacity-100 translate-x": !isChecked,
              "bg-textIcon-primary translate-x-[19px]": isChecked,
            })}
          />
        </div>
      </div>
    </div>
  );
}
