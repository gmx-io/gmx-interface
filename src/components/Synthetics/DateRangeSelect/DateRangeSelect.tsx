import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover, Portal } from "@headlessui/react";
import type { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { sub, type Locale as DateLocale } from "date-fns";
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
import { useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { locales } from "lib/i18n";

import Button from "components/Button/Button";

import CalendarIcon from "img/ic_calendar.svg?react";
import ChevronEdgeLeft from "img/ic_chevron_edge_left.svg?react";
import ChevronLeftIcon from "img/ic_chevron_left.svg?react";

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

/**
 * GMX v1 launch date is 06 sept 2021
 */
const MIN_DATE = new Date(2021, 8, 6);
const MAX_DATE = addYears(new Date(), 1);

const PRESETS = {
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
  days30: msg`30d`,
  days7: msg`7d`,
  days90: msg`90d`,
  days365: msg`Last year`,
  allTime: msg`All time`,
};

const DATE_RANGE_SELECT_PRESETS: PresetPeriod[] = ["days7", "days30", "days90", "days365", "allTime"];

export function DateRangeSelect({ startDate, endDate, onChange, handleClassName }: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    placement: "top-start",
    whileElementsMounted: autoUpdate,
  });

  const onDateRangeChange = useCallback(
    (value: Date | Date[] | [Date | null, Date | null] | null) => {
      if (Array.isArray(value) && value.length === 2) {
        // Handle range selection
        const [start, end] = value;
        if (start === end || (start === null && end === null)) {
          return;
        }
        onChange([start || undefined, end || undefined]);
      } else if (!Array.isArray(value) && value) {
        // Single date clicked in range mode - don't update
        return;
      }
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
  }, [startDate, endDate, locale]);

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
    <Popover className="DateRangeSelect-anchor" ref={refs.setReference}>
      <Popover.Button className={handleClassName}>
        <Button variant="ghost" className="flex items-center gap-4">
          <div className="size-16">
            <CalendarIcon />
          </div>
          <span className="text-body-small whitespace-nowrap font-medium">{buttonText}</span>
        </Button>
      </Popover.Button>
      <Portal>
        <Popover.Panel className="DateRangeSelect-popover" ref={refs.setFloating} style={floatingStyles}>
          <Calendar
            onChange={onDateRangeChange}
            value={startDate && endDate ? ([startDate, endDate] as [Date, Date]) : null}
            selectRange={true}
            locale={localeStr}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            className="DateRangeSelect-reactCalendar"
            minDetail="decade"
            formatMonthYear={(_, date) => format(date, "MMMM, yyyy")}
            prevLabel={<ChevronLeftIcon className="size-20" />}
            nextLabel={<ChevronLeftIcon className="size-20 rotate-180" />}
            prev2Label={<ChevronEdgeLeft className="size-20" />}
            next2Label={<ChevronEdgeLeft className="size-20 rotate-180" />}
          />
          <div className="flex justify-between gap-4 border-t border-slate-600 p-12">
            {DATE_RANGE_SELECT_PRESETS.map((preset) => (
              <Button key={preset} variant="secondary" size="small" data-preset={preset} onClick={handlePresetSelect}>
                {_(PRESET_LABELS[preset])}
              </Button>
            ))}
          </div>
        </Popover.Panel>
      </Portal>
    </Popover>
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
    (value: Date | Date[] | [Date | null, Date | null] | null) => {
      if (value && !Array.isArray(value)) {
        onChange(value);
      } else if (value === null) {
        onChange(undefined);
      }
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
    <Popover className="DateRangeSelect-anchor" ref={refs.setReference}>
      <Popover.Button className={handleClassName}>
        <Button variant="ghost" className="flex items-center gap-4">
          <div className="size-16">
            <CalendarIcon />
          </div>
          <span className="text-body-small whitespace-nowrap font-medium">{buttonText}</span>
        </Button>
      </Popover.Button>
      <Portal>
        <Popover.Panel className="DateRangeSelect-popover" ref={refs.setFloating} style={floatingStyles}>
          <div className="flex gap-4 border-t border-slate-600 p-12">
            {DATE_SELECT_PRESETS.map((preset) => (
              <Button key={preset} variant="secondary" size="small" data-preset={preset} onClick={handlePresetSelect}>
                {_(PRESET_LABELS[preset])}
              </Button>
            ))}
          </div>
          <Calendar
            onChange={onDateChange}
            value={date}
            locale={localeStr}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            className="DateRangeSelect-reactCalendar"
            prevLabel={<ChevronLeftIcon className="size-20" />}
            nextLabel={<ChevronLeftIcon className="size-20 rotate-180" />}
            prev2Label={<ChevronEdgeLeft className="size-20" />}
            next2Label={<ChevronEdgeLeft className="size-20 rotate-180" />}
            minDetail="decade"
            formatMonthYear={(_, date) => format(date, "MMMM, yyyy")}
          />
        </Popover.Panel>
      </Portal>
    </Popover>
  );
}
