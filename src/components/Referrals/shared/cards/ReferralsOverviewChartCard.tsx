import cx from "classnames";

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
    <div className="flex flex-col gap-24 rounded-8 border-1/2 border-stroke-primary bg-fill-background/50 px-adaptive pb-10 pt-adaptive">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-body-small mb-4 font-medium text-textIcon-secondary">
            {tooltipContent ? (
              <Tooltip variant="iconStroke" position="right" content={tooltipContent}>
                {label}
              </Tooltip>
            ) : (
              label
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-24 font-medium text-textIcon-primary numbers">{value}</div>
            {valueChange && (
              <div
                className={cx("rounded-full px-6 py-2 text-12 font-medium numbers", {
                  "bg-green-background text-green-strong": isValueChangePositive !== false,
                  "bg-red-background text-red-strong": isValueChangePositive === false,
                })}
              >
                {valueChange}
              </div>
            )}
            {valueSuffix}
          </div>
        </div>
        {topRightContent}
      </div>
      {children}
    </div>
  );
}
