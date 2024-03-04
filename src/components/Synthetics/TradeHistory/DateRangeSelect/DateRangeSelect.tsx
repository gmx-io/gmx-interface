import { flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import type { Locale as DateLocale } from "date-fns";
import addYears from "date-fns/addYears";
import format from "date-fns/format";
import setTime from "date-fns/set";
import subMonths from "date-fns/subMonths";
import { useCallback, useMemo } from "react";
import { DateRange, ClassNames as DateRangeClassNames, Range, RangeKeyDict } from "react-date-range";

import { dateLocaleMap } from "../TradeHistoryRow/utils/shared";

import Button from "components/Button/Button";

import calendarIcon from "img/ic_calendar.svg";

import "react-date-range/dist/styles.css"; // main css file
import "react-date-range/dist/theme/default.css"; // theme css file
import "./DateRangeSelect.scss";

type Props = {
  startDate?: Date;
  endDate?: Date;
  onChange: (date: [Date | undefined, Date | undefined]) => void;
};

const CALENDAR_ICON_INFO = {
  src: calendarIcon,
};

const MIN_DATE = new Date(2021, 0, 1);
const MAX_DATE = addYears(new Date(), 1);

const DATE_RANGE_CLASSNAMES: DateRangeClassNames = {
  calendarWrapper: "DateRangeSelect-calendarWrapper",
  monthAndYearPickers: "DateRangeSelect-monthAndYearPickers",
  dayNumber: "DateRangeSelect-dayNumber",
  nextPrevButton: "DateRangeSelect-nextPrevButton",
  prevButton: "DateRangeSelect-prevButton",
  nextButton: "DateRangeSelect-nextButton",
  month: "DateRangeSelect-month",
  inRange: "DateRangeSelect-inRange",
  startEdge: "DateRangeSelect-startEdge",
  endEdge: "DateRangeSelect-endEdge",
  dayHovered: "DateRangeSelect-dayHovered",
  dayStartPreview: "DateRangeSelect-dayStartPreview",
  dayInPreview: "DateRangeSelect-dayInPreview",
  dayEndPreview: "DateRangeSelect-dayEndPreview",
  dayStartOfWeek: "DateRangeSelect-dayStartOfWeek",
  dayEndOfWeek: "DateRangeSelect-dayEndOfWeek",
  dayStartOfMonth: "DateRangeSelect-dayStartOfMonth",
  dayEndOfMonth: "DateRangeSelect-dayEndOfMonth",
};

const RANGE_COLORS = ["#262843", "#3ecf8e", "#fed14c"];

export function DateRangeSelect({ startDate, endDate, onChange }: Props) {
  const rangeState = useMemo<[Range]>(
    () => [{ key: "selection", startDate, endDate, color: endDate && startDate ? RANGE_COLORS[0] : "transparent" }],
    [endDate, startDate]
  );

  const {
    refs,
    floatingStyles,
    update: updateFloatingPosition,
  } = useFloating({
    middleware: [offset(10), flip(), shift()],
    placement: "bottom-end",
  });

  const onDateRangeChange = (item: RangeKeyDict) => {
    if (item.selection.startDate == item.selection.endDate) {
      return;
    }
    onChange([item.selection.startDate, item.selection.endDate]);
    updateFloatingPosition();
  };

  const localeStr = i18n.locale;

  const locale: DateLocale = dateLocaleMap[localeStr] || dateLocaleMap.en;

  const buttonText = useMemo(() => {
    const start =
      startDate &&
      format(startDate, "dd MMM yyyy", {
        locale,
      });
    const end = endDate && format(endDate, "dd MMM yyyy", { locale });
    return start && end ? `${start} — ${end}` : t`All time`;
  }, [startDate, locale, endDate]);

  const handleSelectLastMonth = useCallback(() => {
    const now = setTime(new Date(), {
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
    const lastMonth = subMonths(now, 1);
    onChange([lastMonth, now]);
    updateFloatingPosition();
  }, [onChange, updateFloatingPosition]);

  const handleSelectAllTime = useCallback(() => {
    onChange([undefined, undefined]);
    updateFloatingPosition();
  }, [onChange, updateFloatingPosition]);

  return (
    <>
      <Popover as="div" className="DateRangeSelect-anchor" ref={refs.setReference}>
        <Popover.Button as={Button} variant="secondary" imgInfo={CALENDAR_ICON_INFO}>
          {buttonText}
        </Popover.Button>
        <Popover.Panel className="DateRangeSelect-popover" ref={refs.setFloating} style={floatingStyles}>
          <div className="DateRangeSelect-common-items">
            <Button variant="secondary" onClick={handleSelectLastMonth}>
              {t`Last month`}
            </Button>
            <Button variant="secondary" onClick={handleSelectAllTime}>
              {t`All time`}
            </Button>
          </div>
          <DateRange
            classNames={DATE_RANGE_CLASSNAMES}
            editableDateInputs={true}
            onChange={onDateRangeChange}
            moveRangeOnFirstSelection={false}
            ranges={rangeState}
            showDateDisplay={false}
            locale={locale}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            weekStartsOn={1}
            rangeColors={RANGE_COLORS}
          />
        </Popover.Panel>
      </Popover>
    </>
  );
}
