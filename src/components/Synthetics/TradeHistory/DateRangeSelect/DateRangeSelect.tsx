import { Popover } from "@headlessui/react";
import * as dateFns from "date-fns";
import { enUS } from "date-fns/locale";

import { useEffect, useMemo, useState } from "react";
import { DateRange, ClassNames as DateRangeClassNames, Range } from "react-date-range";

import Button from "components/Button/Button";

import calendarIcon from "img/ic_calendar.svg";

import "react-date-range/dist/styles.css"; // main css file
import "react-date-range/dist/theme/default.css"; // theme css file

import "./DateRangeSelect.scss";
import { useFloating, flip, shift, offset } from "@floating-ui/react";

type Props = {
  startDate?: Date;
  endDate?: Date;
  onChange: (date: [Date | undefined, Date | undefined]) => void;
};

const CALENDAR_ICON_INFO = {
  src: calendarIcon,
};

const MIN_DATE = new Date(2021, 0, 1);
const MAX_DATE = dateFns.addYears(new Date(), 1);

const DATE_RANGE_CLASSNAMES: DateRangeClassNames = {
  calendarWrapper: "DateRangeSelect-calendarWrapper",
  monthAndYearPickers: "DateRangeSelect-monthAndYearPickers",
  dayNumber: "DateRangeSelect-dayNumber",
  nextPrevButton: "DateRangeSelect-nextPrevButton",
  prevButton: "DateRangeSelect-prevButton",
  nextButton: "DateRangeSelect-nextButton",
  month: "DateRangeSelect-month",
};

export function DateRangeSelect({ startDate, endDate, onChange }: Props) {
  const [rangeState, setRangeState] = useState<[Range]>([
    {
      startDate: undefined,
      endDate: undefined,
      key: "selection",
    },
  ]);

  useEffect(() => {
    setRangeState([
      {
        startDate: startDate,
        endDate: endDate,
        key: "selection",
      },
    ]);
  }, [startDate, endDate]);

  const onDateRangeChange = (item) => {
    setRangeState([item.selection]);
    if (item.selection.startDate == item.selection.endDate) {
      return;
    }
    onChange([item.selection.startDate, item.selection.endDate]);
  };

  const buttonText = useMemo(() => {
    const start = startDate && dateFns.format(startDate, "dd MMM yyyy");
    const end = endDate && dateFns.format(endDate, "dd MMM yyyy");
    return start && end ? `${start} — ${end}` : "All time";
  }, [startDate, endDate]);

  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
  });

  return (
    <>
      <Popover as="div" className="DateRangeSelect-menu" ref={refs.setReference}>
        <Popover.Button as={Button} variant="secondary" imgInfo={CALENDAR_ICON_INFO}>
          {buttonText}
        </Popover.Button>
        <Popover.Panel className="DateRangeSelect-menu-items" ref={refs.setFloating} style={floatingStyles}>
          <DateRange
            classNames={DATE_RANGE_CLASSNAMES}
            editableDateInputs={true}
            onChange={onDateRangeChange}
            moveRangeOnFirstSelection={false}
            ranges={rangeState}
            showDateDisplay={false}
            locale={enUS}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            weekStartsOn={1}
          />
        </Popover.Panel>
      </Popover>
    </>
  );
}
