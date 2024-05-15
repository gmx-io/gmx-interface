import { useCallback, useMemo } from "react";

import { flip, offset, shift, useFloating, autoUpdate } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import type { Locale as DateLocale } from "date-fns";
import { DateRange, ClassNames as DateRangeClassNames, Range, RangeKeyDict } from "react-date-range";

import addYears from "date-fns/addYears";
import format from "date-fns/format";
import setTime from "date-fns/set";
import subMonths from "date-fns/subMonths";

import dateDe from "date-fns/locale/de";
import dateEn from "date-fns/locale/en-US";
import dateEs from "date-fns/locale/es";
import dateFr from "date-fns/locale/fr";
import dateJa from "date-fns/locale/ja";
import dateKo from "date-fns/locale/ko";
import dateRu from "date-fns/locale/ru";
import dateZh from "date-fns/locale/zh-CN";

import { locales } from "lib/i18n";

import Button from "components/Button/Button";

import calendarIcon from "img/ic_calendar.svg";

import "react-date-range/dist/styles.css"; // main css file
import "react-date-range/dist/theme/default.css"; // theme css file
import "./DateRangeSelect.scss";

export const LOCALE_DATE_LOCALE_MAP: Record<keyof typeof locales, DateLocale> = {
  en: dateEn,
  es: dateEs,
  zh: dateZh,
  ko: dateKo,
  ru: dateRu,
  ja: dateJa,
  fr: dateFr,
  de: dateDe,
  pseudo: dateEn,
};

type Props = {
  startDate?: Date;
  endDate?: Date;
  onChange: (date: [Date | undefined, Date | undefined]) => void;
  handleClassName?: string;
};

const CALENDAR_ICON_INFO = {
  src: calendarIcon,
};

/**
 * 4th of August 2023
 */
const MIN_DATE = new Date(2023, 7, 4);
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

export function DateRangeSelect({ startDate, endDate, onChange, handleClassName }: Props) {
  const rangeState = useMemo<[Range]>(
    () => [{ key: "selection", startDate, endDate, color: endDate && startDate ? RANGE_COLORS[0] : "transparent" }],
    [endDate, startDate]
  );

  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const onDateRangeChange = useCallback(
    (item: RangeKeyDict) => {
      if (item.selection.startDate == item.selection.endDate) {
        return;
      }
      onChange([item.selection.startDate, item.selection.endDate]);
    },
    [onChange]
  );

  const localeStr = i18n.locale;

  const locale: DateLocale = LOCALE_DATE_LOCALE_MAP[localeStr] ?? LOCALE_DATE_LOCALE_MAP.en;

  const buttonText = useMemo(() => {
    if (!startDate || !endDate) {
      return t`All time`;
    }

    const start = format(startDate, "dd MMM yyyy", {
      locale,
    });
    const end = format(endDate, "dd MMM yyyy", { locale });

    return `${start} — ${end}`;
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
  }, [onChange]);

  const handleSelectAllTime = useCallback(() => {
    onChange([undefined, undefined]);
  }, [onChange]);

  return (
    <>
      <Popover as="div" className="DateRangeSelect-anchor" ref={refs.setReference}>
        <Popover.Button
          as={Button}
          className={handleClassName}
          variant="secondary"
          imgInfo={CALENDAR_ICON_INFO}
          refName="buttonRef"
        >
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
