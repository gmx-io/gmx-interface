import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { sub, type Locale as DateLocale } from "date-fns";
import { useCallback, useMemo } from "react";
import { Calendar, DateRange, ClassNames as DateRangeClassNames, Range, RangeKeyDict } from "react-date-range";

import addYears from "date-fns/addYears";
import format from "date-fns/format";

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
 * GMX v1 launch date is 06 sept 2021
 */
const MIN_DATE = new Date(2021, 8, 6);
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
  selected: "DateRangeSelect-selected",
  dayDisabled: "DateRangeSelect-dayDisabled",
};

const RANGE_COLORS = ["#262843", "#3ecf8e", "#fed14c"];

const PRESETS = {
  month: {
    months: 1,
  } satisfies Duration,
  days30: {
    days: 30,
  } satisfies Duration,
  days7: {
    days: 7,
  } satisfies Duration,
  days90: {
    days: 90,
  } satisfies Duration,
  days365: {
    days: 365,
  } satisfies Duration,
  allTime: undefined,
};

type PresetPeriod = keyof typeof PRESETS;

const PRESET_LABELS: Record<PresetPeriod, MessageDescriptor> = {
  month: msg`Last month`,
  days30: msg`Last 30d`,
  days7: msg`Last 7d`,
  days90: msg`Last 90d`,
  days365: msg`Last 365d`,
  allTime: msg`All time`,
};

const DATE_RANGE_SELECT_PRESETS: PresetPeriod[] = ["days7", "days30", "days90", "days365", "allTime"];

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

  const { _, i18n } = useLingui();
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

  const handlePresetSelect = useCallback(
    (event: React.MouseEvent) => {
      const button = event.target as HTMLButtonElement;
      const preset = button.dataset.preset as keyof typeof PRESETS;

      if (!preset) {
        return;
      }

      if (preset === "allTime") {
        onChange([undefined, undefined]);
        return;
      }

      const duration = PRESETS[preset];

      if (!duration) {
        return;
      }

      const res = sub(new Date(), duration);

      onChange([res, new Date()]);
    },
    [onChange]
  );

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
            {DATE_RANGE_SELECT_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                className="!px-10 !py-6"
                data-preset={preset}
                onClick={handlePresetSelect}
              >
                {_(PRESET_LABELS[preset])}
              </Button>
            ))}
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

const DATE_SELECT_PRESETS: PresetPeriod[] = ["days7", "days30", "days90", "days365", "allTime"];

export function DateSelect({
  date,
  onChange,
  handleClassName,
  buttonTextPrefix,
}: {
  date: Date | undefined;
  onChange: (date: Date | undefined) => void;
  handleClassName?: string;
  buttonTextPrefix?: string;
}) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const onDateChange = useCallback(
    (item: Date) => {
      onChange(item);
    },
    [onChange]
  );

  const { i18n, _ } = useLingui();
  const localeStr = i18n.locale;

  const locale: DateLocale = LOCALE_DATE_LOCALE_MAP[localeStr] ?? LOCALE_DATE_LOCALE_MAP.en;

  const buttonText = useMemo(() => {
    if (!date) {
      return t`All time`;
    }

    const start = format(date, "dd MMM yyyy", {
      locale,
    });

    if (buttonTextPrefix) {
      return `${buttonTextPrefix} ${start}`;
    }

    return `${start}`;
  }, [buttonTextPrefix, date, locale]);

  const handlePresetSelect = useCallback(
    (event: React.MouseEvent) => {
      const button = event.target as HTMLButtonElement;
      const preset = button.dataset.preset as keyof typeof PRESETS;

      if (!preset) {
        return;
      }

      if (preset === "allTime") {
        onChange(undefined);
        return;
      }

      const duration = PRESETS[preset];

      if (!duration) {
        return;
      }

      const res = sub(new Date(), duration);

      onChange(res);
    },
    [onChange]
  );

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
            {DATE_SELECT_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                className="!px-10 !py-6"
                data-preset={preset}
                onClick={handlePresetSelect}
              >
                {_(PRESET_LABELS[preset])}
              </Button>
            ))}
          </div>
          <Calendar
            classNames={DATE_RANGE_CLASSNAMES}
            editableDateInputs={true}
            onChange={onDateChange}
            date={date}
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
