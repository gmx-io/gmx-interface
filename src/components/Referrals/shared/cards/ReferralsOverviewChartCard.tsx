import cx from "classnames";

import Tooltip from "components/Tooltip/Tooltip";

export function OverviewChartCard({
  label,
  tooltipContent,
  value,
  valueChange,
  isValueChangePositive,
  topRightContent,
  children,
}: {
  label: React.ReactNode;
  tooltipContent?: React.ReactNode;
  value: React.ReactNode;
  valueChange?: React.ReactNode;
  isValueChangePositive?: boolean;
  topRightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 px-20 pb-10 pt-20")}>
      <div className="mb-24 flex items-start justify-between">
        <div>
          <div className="text-body-small mb-4 font-medium text-typography-secondary">
            {tooltipContent ? (
              <Tooltip variant="iconStroke" position="right" content={tooltipContent}>
                {label}
              </Tooltip>
            ) : (
              label
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-24 font-medium text-typography-primary numbers">{value}</div>
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
          </div>
        </div>
        {topRightContent}
      </div>
      {children}
    </div>
  );
}
