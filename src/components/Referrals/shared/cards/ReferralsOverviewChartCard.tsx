import cx from "classnames";

import { ScaledText } from "components/ScaledText/ScaledText";
import Tooltip from "components/Tooltip/Tooltip";

export function OverviewChartCard({
  label,
  tooltipContent,
  value,
  valueSuffix,
  valueChange,
  isValueChangePositive,
  topRightContent,
  children,
}: {
  label: React.ReactNode;
  tooltipContent?: React.ReactNode;
  value: React.ReactNode;
  valueSuffix?: React.ReactNode;
  valueChange?: React.ReactNode;
  isValueChangePositive?: boolean;
  topRightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-24 rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 px-adaptive pb-10 pt-adaptive">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="text-body-small font-medium text-typography-secondary">
            {tooltipContent ? (
              <Tooltip variant="iconStroke" position="right" content={tooltipContent}>
                {label}
              </Tooltip>
            ) : (
              label
            )}
          </div>
          {topRightContent}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 max-w-full text-24 font-medium text-typography-primary numbers">
            <ScaledText>{value}</ScaledText>
          </div>
          {valueChange && (
            <div
              className={cx("rounded-full px-6 py-2 text-12 font-medium numbers", {
                "bg-green-900 text-green-500": isValueChangePositive !== false,
                "bg-red-900 text-red-500": isValueChangePositive === false,
              })}
            >
              {valueChange}
            </div>
          )}
          {valueSuffix}
        </div>
      </div>
      {children}
    </div>
  );
}
