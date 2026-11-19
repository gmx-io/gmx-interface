import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { DateRange } from "lib/dates";

import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import CalendarIcon from "img/ic_calendar.svg?react";

import { STATS_ICONS, type StatsIconName } from "./StatsIcons";

/*
 * Segmented control: the design-system Segmented control (Figma "Segmented control" / "Segment", the Perpetuals / Swap
 * switch): 32px track on Fill/SurfaceElevated, 4px inset and gap, 24px options with 8px sides and 4px corners,
 * a Fill/Accent highlight that slides to the picked option.
 */
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300";
const TRACK = cx("relative flex h-32 shrink-0 items-center gap-4 rounded-8 bg-slate-800 p-4", FOCUS_RING);
const ITEM = cx(
  "text-body-small relative z-10 flex h-24 items-center justify-center rounded-4 px-8 font-medium transition-colors",
  FOCUS_RING
);
const ITEM_ICON = "!px-4";
const ON_TEXT = "text-typography-primary";
const OFF_TEXT = "text-typography-secondary hover:text-typography-primary";
const THUMB =
  "absolute bottom-4 top-4 rounded-4 bg-slate-600 transition-all duration-200 ease-out motion-reduce:transition-none";

export type SegOption<V extends string> = {
  id: V;
  label?: string;
  icon?: StatsIconName;
  /** Full name, shown on hover; also the accessible name of icon-only options. */
  title?: string;
  disabled?: boolean;
};

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  const updateThumb = useCallback(() => {
    const track = trackRef.current;
    const active = track?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!track || !active) return setThumb(null);
    const box = track.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (!box.width || !a.width) return;
    setThumb({ left: a.left - box.left, width: a.width });
  }, []);

  useLayoutEffect(() => {
    updateThumb();
    const frame = requestAnimationFrame(updateThumb);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateThumb) : undefined;
    if (observer && trackRef.current) observer.observe(trackRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [value, options.length, updateThumb]);

  const thumbStyle = useMemo(() => (thumb ? { left: thumb.left, width: thumb.width } : undefined), [thumb]);

  return (
    <div ref={trackRef} className={TRACK} role="group" aria-label={label}>
      {thumbStyle ? <div aria-hidden className={THUMB} style={thumbStyle} /> : null}
      {options.map((o) => {
        const on = o.id === value;
        const Icon = o.icon ? STATS_ICONS[o.icon] : null;
        return (
          <button
            key={o.id}
            type="button"
            className={cx(ITEM, on ? ON_TEXT : OFF_TEXT, {
              [ITEM_ICON]: Icon,
              "cursor-not-allowed !text-typography-inactive hover:!text-typography-inactive": o.disabled,
            })}
            aria-pressed={on}
            // text options are named by their visible text; only icon-only options need a label
            aria-label={Icon ? o.title ?? o.label : undefined}
            title={o.title ?? o.label}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
          >
            {Icon ? <Icon /> : o.label}
          </button>
        );
      })}
    </div>
  );
}

/* A single icon button in the same track (table view, date range). "On" uses the same slate-600 highlight. */
function iconItemClass(on: boolean) {
  return cx(ITEM, ITEM_ICON, on ? "bg-slate-600 text-typography-primary" : OFF_TEXT);
}

export function SegToggle({
  icon,
  on,
  onToggle,
  label,
}: {
  icon: StatsIconName;
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon = STATS_ICONS[icon];
  return (
    <div className={TRACK}>
      <button
        type="button"
        className={iconItemClass(on)}
        aria-pressed={on}
        aria-label={label}
        title={label}
        onClick={onToggle}
      >
        <Icon />
      </button>
    </div>
  );
}

export function RangeButton({
  range,
  onChange,
}: {
  range: DateRange | null;
  onChange: (range: DateRange | null) => void;
}) {
  const isCustom = Boolean(range && range[0] && range[1]);
  return (
    <DateRangeSelect
      startDate={range?.[0]}
      endDate={range?.[1]}
      timezone="utc"
      handleClassName={TRACK}
      onChange={(r) => onChange(r[0] && r[1] ? r : null)}
      renderHandle={({ open }) => (
        <span className={iconItemClass(isCustom || open)} title={t`Date range`}>
          <CalendarIcon className="size-16" aria-hidden />
          <span className="sr-only">
            <Trans>Date range</Trans>
          </span>
        </span>
      )}
    />
  );
}

/* A card or figure title with an info tooltip. heading = the card's title, shown as an h3 for screen readers. */
export function InfoTitle({
  title,
  note,
  className,
  heading,
}: {
  title: ReactNode;
  note?: string;
  className?: string;
  heading?: boolean;
}) {
  const content = note ? (
    <StandardTooltip
      variant="iconStroke"
      iconClassName="text-typography-secondary"
      handle={<span className={className}>{title}</span>}
      content={note}
      position="bottom-start"
    />
  ) : (
    <span className={className}>{title}</span>
  );
  return heading ? <h3 className="min-w-0">{content}</h3> : content;
}

export function LegendChip({
  label,
  color,
  off,
  onClick,
  extra,
}: {
  label: string;
  color: string;
  off?: boolean;
  onClick?: () => void;
  extra?: ReactNode;
}) {
  const dotStyle = useMemo(() => ({ background: off ? "transparent" : color, borderColor: color }), [off, color]);
  const inner = (
    <>
      <span className="size-8 shrink-0 rounded-full border-2" style={dotStyle} />
      <span>{label}</span>
      {extra}
    </>
  );
  const base = "text-body-small flex items-center gap-6 font-medium";
  if (!onClick) return <span className={cx(base, "text-typography-secondary")}>{inner}</span>;
  return (
    <button
      type="button"
      aria-pressed={!off}
      onClick={onClick}
      className={cx(
        base,
        FOCUS_RING,
        "rounded-full px-8 py-2 transition-colors hover:bg-fill-surfaceHover",
        off ? "text-typography-inactive" : "text-typography-secondary hover:text-typography-primary"
      )}
    >
      {inner}
    </button>
  );
}

/* "Show all" next to the legend chips. */
export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cx("text-body-small rounded-4 px-8 font-medium text-blue-300 hover:text-blue-100", FOCUS_RING)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PeriodSelect<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  const selected = options.find((o) => o.id === value) ?? options[0];
  return (
    <SelectorBase
      modalLabel={label}
      popoverPlacement="bottom-end"
      desktopPanelClassName="mt-8 !border !border-slate-600 !bg-slate-900 !outline-none"
      handleClassName={cx(TRACK, "gap-4 !px-10 text-typography-primary")}
      chevronClassName="!text-typography-secondary group-hover:!text-typography-primary"
      label={<span className="text-body-small whitespace-nowrap font-medium">{selected?.label}</span>}
    >
      <div className="flex max-h-[320px] flex-col overflow-y-auto">
        {options.map((o) => (
          <PeriodOption key={o.id} option={o} isSelected={o.id === value} onSelect={onChange} />
        ))}
      </div>
    </SelectorBase>
  );
}

function PeriodOption<V extends string>({
  option,
  isSelected,
  onSelect,
}: {
  option: { id: V; label: string };
  isSelected: boolean;
  onSelect: (v: V) => void;
}) {
  const close = useSelectorClose();
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cx(
        "text-body-medium whitespace-nowrap px-12 py-8 text-left font-medium text-typography-secondary hover:bg-fill-surfaceHover hover:text-typography-primary focus-visible:bg-fill-surfaceHover focus-visible:text-typography-primary focus-visible:outline-none",
        { "!text-typography-primary": isSelected }
      )}
      onClick={() => {
        onSelect(option.id);
        close();
      }}
    >
      {option.label}
    </button>
  );
}

export function TbdBadge({ children }: { children: ReactNode }) {
  return (
    <span className="text-body-small rounded-full bg-yellow-900 px-8 py-2 font-medium text-yellow-300">{children}</span>
  );
}
