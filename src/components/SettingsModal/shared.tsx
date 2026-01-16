import cx from "classnames";
import type { ReactNode } from "react";

import { useBreakpoints } from "lib/useBreakpoints";

import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import PercentageInput from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueInput } from "components/ValueInput/ValueInput";

import InfoIcon from "img/ic_info.svg?react";

export enum TradingMode {
  Classic = "classic",
  Express = "express",
  Express1CT = "express-1ct",
}

export function SettingsSection({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-16 rounded-8 bg-fill-surfaceElevated50 p-12", className)}>{children}</div>
  );
}

export function InputSetting({
  title,
  description,
  defaultValue,
  value,
  maxValue,
  onChange,
  onBlur,
  className,
  suggestions,
  type = "percentage",
}: {
  title: ReactNode;
  description?: ReactNode;
  defaultValue: number;
  value?: number;
  maxValue?: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  className?: string;
  suggestions?: number[];
  type?: "percentage" | "number";
}) {
  const titleComponent = <span className="text-14 font-medium">{title}</span>;

  const titleWithDescription = description ? (
    <TooltipWithPortal position="bottom" content={description} variant="icon">
      {titleComponent}
    </TooltipWithPortal>
  ) : (
    titleComponent
  );

  const Input =
    type === "percentage" ? (
      <PercentageInput
        defaultValue={defaultValue}
        value={value}
        maxValue={maxValue}
        onChange={onChange}
        tooltipPosition="bottom"
        suggestions={suggestions}
      />
    ) : (
      <ValueInput value={value ?? 0} onChange={onChange} onBlur={onBlur} className="w-[80px]" />
    );

  return (
    <div className={cx("flex items-center justify-between", className)}>
      <div className="mr-8">{titleWithDescription}</div>
      {Input}
    </div>
  );
}

export function SettingButton({
  title,
  icon,
  description,
  onClick,
  active,
  chip,
  info,
  disabled,
  disabledTooltip,
}: {
  title: ReactNode;
  icon: ReactNode;
  description: ReactNode;
  active?: boolean;
  chip?: ReactNode;
  onClick: () => void;
  info?: ReactNode;
  disabled?: boolean;
  disabledTooltip?: ReactNode;
}) {
  const { isMobile, isTablet } = useBreakpoints();

  const handleInfoClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // to do: better identify mobile devices
    if (!isMobile && !isTablet) {
      e.stopPropagation();
    }
  };

  const Wrapper = disabled && disabledTooltip ? TooltipWithPortal : NoopWrapper;

  return (
    <Wrapper content={disabledTooltip} variant="none">
      <div
        className={cx(
          `grid min-h-66 select-none grid-cols-[66px_auto] items-center rounded-8 border border-solid hover:border-slate-100`,
          active ? "border-slate-100 text-typography-primary" : "border-slate-600",
          disabled ? "muted cursor-not-allowed" : "cursor-pointer"
        )}
        onClick={disabled ? undefined : onClick}
      >
        <div
          className={cx(
            "flex items-center justify-center text-typography-secondary",
            disabled && "opacity-50",
            active && "text-typography-primary"
          )}
        >
          {icon}
        </div>
        <div className="flex gap-4 py-6">
          <div className="flex flex-col border-l border-solid border-slate-600 pl-12">
            <div className="flex items-center gap-4">
              <div>{title}</div>
              {info && (
                <TooltipWithPortal
                  content={info}
                  handleClassName="-mb-6"
                  handle={<InfoIcon className="size-12" onClickCapture={handleInfoClick} />}
                  variant="none"
                />
              )}
            </div>
            <div>{description}</div>
          </div>
          {chip ? <div className="mr-6 mt-4">{chip}</div> : null}
        </div>
      </div>
    </Wrapper>
  );
}

export function Chip({ children, color }: { children: ReactNode; color: "blue" | "gray" }) {
  const colorClass = {
    blue: "bg-blue-600",
    gray: "bg-slate-500",
  }[color];

  return (
    <div className={cx(`rounded-full px-8 py-4 pb-3 text-[10px] font-medium text-white`, colorClass)}>{children}</div>
  );
}
