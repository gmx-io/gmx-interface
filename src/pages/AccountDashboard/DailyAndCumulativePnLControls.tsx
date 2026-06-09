import type { MessageDescriptor } from "@lingui/core";
import { msg, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";

import type { SetDateRange } from "lib/dates";

import Button from "components/Button/Button";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";

import DownloadIcon from "img/ic_download2.svg?react";

import type { PnlChartGrouping } from "./DailyAndCumulativePnL.utils";

const GROUPING_LABELS: Record<PnlChartGrouping, MessageDescriptor> = {
  daily: msg`Daily`,
  weekly: msg`Weekly`,
  monthly: msg`Monthly`,
};

const GROUPING_VALUES: PnlChartGrouping[] = ["daily", "weekly", "monthly"];

export function DailyAndCumulativePnLControls({
  startDate,
  endDate,
  grouping,
  isMobile,
  onDateRangeChange,
  onGroupingChange,
  onImageDownload,
}: {
  startDate?: Date;
  endDate?: Date;
  grouping: PnlChartGrouping;
  isMobile: boolean;
  onDateRangeChange: SetDateRange;
  onGroupingChange: (grouping: PnlChartGrouping) => void;
  onImageDownload: () => void;
}) {
  return (
    <div data-exclude className="flex flex-wrap items-stretch justify-end gap-8">
      <Button variant="ghost" className="inline-flex items-center gap-4" data-exclude onClick={onImageDownload}>
        <DownloadIcon className="size-16 shrink-0" />
        <Trans>PNG</Trans>
      </Button>
      <PnlChartGroupingSelect
        grouping={grouping}
        onChange={onGroupingChange}
        buttonTextClassName={
          isMobile ? "text-body-small max-w-[110px] truncate whitespace-nowrap font-medium" : undefined
        }
      />
      <DateRangeSelect
        startDate={startDate}
        endDate={endDate}
        onChange={onDateRangeChange}
        buttonTextClassName={
          isMobile ? "text-body-small max-w-[150px] truncate whitespace-nowrap font-medium" : undefined
        }
      />
    </div>
  );
}

function PnlChartGroupingSelect({
  grouping,
  onChange,
  buttonTextClassName,
}: {
  grouping: PnlChartGrouping;
  onChange: (grouping: PnlChartGrouping) => void;
  buttonTextClassName?: string;
}) {
  const { _ } = useLingui();
  const groupingOptions = useMemo(
    () => GROUPING_VALUES.map((value) => ({ value, label: _(GROUPING_LABELS[value]) })),
    [_]
  );
  const selectedOption = groupingOptions.find((option) => option.value === grouping) ?? groupingOptions[0];

  return (
    <SelectorBase
      modalLabel={_(msg`Grouping`)}
      popoverPlacement="bottom-end"
      desktopPanelClassName="mt-8 !border !border-slate-600 !bg-slate-900 !outline-none"
      handleClassName="button ghost center flex min-h-32 gap-4 px-12 py-6 text-[13px] max-md:px-10 max-md:py-6"
      chevronClassName="!text-typography-secondary group-hover:!text-typography-primary"
      label={
        <span className={buttonTextClassName ?? "text-body-small whitespace-nowrap font-medium"}>
          {selectedOption.label}
        </span>
      }
    >
      <div>
        {groupingOptions.map((option) => (
          <PnlChartGroupingOption
            key={option.value}
            option={option}
            isSelected={option.value === grouping}
            onSelect={onChange}
          />
        ))}
      </div>
    </SelectorBase>
  );
}

function PnlChartGroupingOption({
  option,
  isSelected,
  onSelect,
}: {
  option: { value: PnlChartGrouping; label: string };
  isSelected: boolean;
  onSelect: (grouping: PnlChartGrouping) => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx(
        "text-body-medium cursor-pointer p-8 font-medium text-typography-secondary hover:bg-fill-surfaceHover hover:text-typography-primary",
        {
          "!text-typography-primary": isSelected,
        }
      )}
      onClick={() => {
        onSelect(option.value);
        close();
      }}
    >
      {option.label}
    </div>
  );
}
