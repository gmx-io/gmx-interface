import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type ReactNode, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type DateRange, toUtcDayEndByCalendarDate, toUtcDayStartByCalendarDate } from "lib/dates";
import { useBreakpoints } from "lib/useBreakpoints";

import {
  ACTIVE_BAR,
  ACTIVE_DOT,
  AXIS_TICK,
  BandCursor,
  BAR_RADIUS_TOP,
  ChartTip,
  ChartTipRow,
  GRID_PROPS,
  LINE_CURSOR,
  PARTIAL_OPACITY,
  TOOLTIP_WRAPPER_STYLE,
} from "./StatsChartParts";
import { InfoTitle, RangeButton, Segmented, type SegOption } from "./StatsControls";
import {
  aggregate,
  ALL_TIME,
  CHART_COLORS,
  DAYS,
  END,
  fmtCompact,
  fmtDate,
  fmtFull,
  type Grain,
  M,
  N,
  OI_TOTAL,
  pctChange,
  sliceRows,
  START,
  type StatsRow,
  TOTAL_VOL,
  type Unit,
} from "./statsData";
import { NO_VALUE, StatsStatus, useStatsDataState } from "./statsDataState";

function intervalOptions(): SegOption<Grain>[] {
  return [
    { id: "D", label: t({ message: "1D", comment: "Chart interval button: one bar per day" }), title: t`Daily` },
    { id: "W", label: t({ message: "7D", comment: "Chart interval button: one bar per week" }), title: t`Weekly` },
    { id: "M", label: t({ message: "1M", comment: "Chart interval button: one bar per month" }), title: t`Monthly` },
    {
      id: "Q",
      label: t({ message: "3M", comment: "Chart interval button: one bar per quarter" }),
      title: t`Quarterly`,
    },
    { id: "Y", label: t({ message: "1Y", comment: "Chart interval button: one bar per year" }), title: t`Yearly` },
  ];
}

type HeroChartType = "bar" | "line" | "cum";

function heroTypeOptions(): SegOption<HeroChartType>[] {
  return [
    { id: "bar", icon: "bar", title: t`Bar` },
    { id: "line", icon: "line", title: t`Line` },
    { id: "cum", icon: "cum", title: t`Cumulative` },
  ];
}

const OV_MARGIN = { top: 10, right: 4, bottom: 0, left: 0 };
const SPARK_MARGIN = { top: 6, right: 0, bottom: 0, left: 0 };
const SPARK_DOMAIN: [string, string] = ["dataMin", "dataMax"];

type OvRow = StatsRow & { v: number; cum: number };

function useOvRows(a: Float64Array, iv: Grain) {
  return useMemo(() => {
    const r = aggregate([{ key: "v", label: "", color: "", arr: a }], "flow", iv, 0) as OvRow[];
    let c = 0;
    for (const x of r) {
      c += x.v;
      x.cum = c;
    }
    return r;
  }, [a, iv]);
}

/** Change against an earlier day, e.g. "1d +0.30%". Hidden until the data is ready. */
export function Delta({ label, v }: { label: string; v: number }) {
  return (
    <span className="text-body-small flex items-center gap-4 text-typography-secondary">
      {label}
      <span className={cx("font-medium numbers", v >= 0 ? "text-green-500" : "text-red-500")}>
        {v >= 0 ? "+" : "−"}
        {Math.abs(v).toFixed(2)}%
      </span>
    </span>
  );
}

function Deltas({ a }: { a: Float64Array }) {
  const v = a[N - 1];
  return (
    <div className="flex gap-16">
      <Delta label={t({ message: "1d", comment: "Change against one day earlier" })} v={pctChange(v, a[N - 2])} />
      <Delta label={t({ message: "30d", comment: "Change against 30 days earlier" })} v={pctChange(v, a[N - 31])} />
    </div>
  );
}

export function OvCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("flex min-w-0 flex-col gap-8 rounded-8 bg-slate-900 p-adaptive", className)}>
      {children}
    </section>
  );
}

function OvTip({
  active,
  payload,
  grain,
  unit,
  showCum,
}: {
  active?: boolean;
  payload?: { payload: OvRow }[];
  grain: Grain;
  unit: Unit;
  showCum: boolean;
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const period = fmtDate(r.d, grain, true);
  return (
    <ChartTip head={r.p ? t`${period} · partial` : period}>
      <ChartTipRow label={grain === "D" ? t`Day` : t`Period`} value={fmtFull(r.v, unit)} />
      {showCum ? <ChartTipRow label={t`Cumulative`} value={fmtFull(r.cum, unit)} /> : null}
    </ChartTip>
  );
}

function OvBarChart({
  view,
  grain,
  type,
  height,
  unit,
}: {
  view: OvRow[];
  grain: Grain;
  type: HeroChartType;
  height: number;
  unit: Unit;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={view} margin={OV_MARGIN} barCategoryGap="14%">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="d"
          tickFormatter={(v: number) => fmtDate(v, grain)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={(v: number) => fmtCompact(v, unit)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          cursor={type === "bar" ? <BandCursor count={view.length} /> : LINE_CURSOR}
          isAnimationActive={false}
          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
          content={<OvTip grain={grain} unit={unit} showCum={type === "cum"} />}
        />
        {type === "bar" ? (
          <Bar
            dataKey="v"
            fill={CHART_COLORS.s1}
            radius={BAR_RADIUS_TOP}
            maxBarSize={48}
            isAnimationActive={false}
            activeBar={ACTIVE_BAR}
          >
            {view.map((r, i) => (
              <Cell key={i} fillOpacity={r.p ? PARTIAL_OPACITY : 1} />
            ))}
          </Bar>
        ) : null}
        {type === "line" ? (
          <Line
            dataKey="v"
            type="monotone"
            stroke={CHART_COLORS.s1}
            strokeWidth={2}
            dot={false}
            activeDot={ACTIVE_DOT}
            isAnimationActive={false}
          />
        ) : null}
        {type === "cum" ? (
          <Area
            dataKey="cum"
            type="monotone"
            stroke={CHART_COLORS.s1}
            strokeWidth={2}
            fill={CHART_COLORS.s1}
            fillOpacity={0.16}
            activeDot={ACTIVE_DOT}
            isAnimationActive={false}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function VolumeHeroCard() {
  const dataState = useStatsDataState();
  const { isMobile } = useBreakpoints();
  const [iv, setIv] = useState<Grain>("W");
  const [ct, setCt] = useState<HeroChartType>("bar");
  // null = all time, like the prototype
  const [range, setRange] = useState<DateRange | null>(null);
  const rows = useOvRows(TOTAL_VOL, iv);
  const from = range?.[0] ? Math.max(START, toUtcDayStartByCalendarDate(range[0])) : START;
  const to = range?.[1] ? Math.min(END, toUtcDayEndByCalendarDate(range[1])) : END;
  const [si, ei] = sliceRows(rows, iv, from, to);
  const view = rows.slice(si, ei + 1);
  const ready = dataState === "ready";
  const latestDay = fmtDate(END, "D", true);
  const chartHeight = isMobile ? 260 : 380;
  return (
    <OvCard className="lg:row-span-2">
      <div className="flex flex-wrap items-start justify-between gap-12">
        <InfoTitle
          heading
          title={t`Total volume`}
          note={t`Perps and swaps, all chains. The headline is the latest full day (${latestDay}); bars use the selected interval.`}
          className="text-body-medium font-medium text-typography-secondary"
        />
        <div className="flex flex-wrap items-center gap-8">
          <Segmented label={t`Chart type`} options={heroTypeOptions()} value={ct} onChange={setCt} />
          <Segmented label={t`Interval`} options={intervalOptions()} value={iv} onChange={setIv} />
          <RangeButton range={range} onChange={setRange} />
        </div>
      </div>
      <div className="text-h1 numbers">{ready ? fmtCompact(TOTAL_VOL[N - 1], "usd", 2) : NO_VALUE}</div>
      {ready ? <Deltas a={TOTAL_VOL} /> : null}
      <div className="mt-8 grow">
        {ready ? (
          <OvBarChart view={view} grain={iv} type={ct} height={chartHeight} unit="usd" />
        ) : (
          <StatsStatus state={dataState} className={isMobile ? "h-[260px]" : "h-[380px]"} />
        )}
      </div>
    </OvCard>
  );
}

export function StatSparkCard({
  title,
  a,
  unit,
  meta,
  note,
}: {
  title: string;
  a: Float64Array;
  unit: Unit;
  meta?: string;
  note?: string;
}) {
  const dataState = useStatsDataState();
  const ready = dataState === "ready";
  const data = useMemo(() => {
    const out: { d: number; v: number }[] = [];
    for (let i = N - 30; i < N; i++) out.push({ d: DAYS[i], v: a[i] });
    return out;
  }, [a]);
  return (
    <OvCard className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <div className="flex flex-col gap-8">
          <InfoTitle
            heading
            title={title}
            note={note}
            className="text-body-medium font-medium text-typography-secondary"
          />
          <div className="text-h2 numbers">{ready ? fmtCompact(a[N - 1], unit, 2) : NO_VALUE}</div>
          {ready ? <Deltas a={a} /> : null}
          {meta ? <div className="text-body-small text-typography-secondary">{meta}</div> : null}
        </div>
      </div>
      {/* the sparkline runs to the card's bottom edge and fills any extra height in the row */}
      <div className="relative -mx-16 -mb-16 mt-4 min-h-[96px] flex-1 md:-mx-20 md:-mb-20">
        <div className="absolute inset-0">
          {ready ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={SPARK_MARGIN}>
                <YAxis hide domain={SPARK_DOMAIN} />
                <XAxis dataKey="d" hide />
                <Tooltip
                  cursor={LINE_CURSOR}
                  isAnimationActive={false}
                  wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTip head={fmtDate(payload[0].payload.d, "D", true)}>
                        <ChartTipRow label={t`Value`} value={fmtFull(payload[0].payload.v, unit)} />
                      </ChartTip>
                    ) : null
                  }
                />
                <Area
                  dataKey="v"
                  type="linear"
                  stroke={CHART_COLORS.s1}
                  strokeWidth={1.6}
                  fill={CHART_COLORS.s1}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <StatsStatus state={dataState} className="h-full overflow-hidden" />
          )}
        </div>
      </div>
    </OvCard>
  );
}

function FeesHeroCard() {
  const dataState = useStatsDataState();
  const ready = dataState === "ready";
  const [iv, setIv] = useState<Grain>("W");
  const rows = useOvRows(M.fees, iv);
  let s30 = 0;
  for (let i = N - 30; i < N; i++) s30 += M.fees[i];
  const fig = (v: number) => (ready ? fmtCompact(v, "usd", 2) : NO_VALUE);
  return (
    <OvCard>
      <div className="flex flex-wrap items-start justify-between gap-12">
        <InfoTitle
          heading
          title={t`Fees`}
          note={t`The headline is the last 30 days. Gross fees, funding excluded.`}
          className="text-body-medium font-medium text-typography-secondary"
        />
        <Segmented label={t`Interval`} options={intervalOptions()} value={iv} onChange={setIv} />
      </div>
      <div className="flex flex-wrap items-end gap-x-24 gap-y-8">
        <div className="text-h2 numbers">{fig(s30)}</div>
        <KV k={t`Annualized`} v={fig((s30 / 30) * 365)} />
        <KV k={t`Daily avg`} v={fig(s30 / 30)} />
      </div>
      {ready ? (
        <OvBarChart view={rows} grain={iv} type="bar" height={150} unit="usd" />
      ) : (
        <StatsStatus state={dataState} className="h-[150px]" />
      )}
    </OvCard>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-body-small text-typography-secondary">{k}</span>
      <span className="text-body-large font-medium numbers">{v}</span>
    </div>
  );
}

/** k = label, v = value, sub = second value after it, m = small note below. Values show a dash until data is ready. */
export type StatItem = { k: string; v: string; sub?: string; m?: string };

export function StatRow({ items, twoCols }: { items: StatItem[]; twoCols?: boolean }) {
  const ready = useStatsDataState() === "ready";
  return (
    <div
      className={cx("grid gap-8", {
        "md:grid-cols-3": items.length === 3,
        "grid-cols-2 lg:grid-cols-4": items.length === 4 && !twoCols,
        "grid-cols-2": twoCols,
      })}
    >
      {items.map((it) => (
        <div key={it.k} className="flex min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-adaptive">
          <div className="text-body-medium font-medium text-typography-secondary">{it.k}</div>
          <div className="flex flex-wrap items-baseline gap-x-8">
            <span className="text-h2 numbers">{ready ? it.v : NO_VALUE}</span>
            {it.sub && ready ? (
              <span className="text-body-medium text-typography-secondary numbers">{it.sub}</span>
            ) : null}
          </div>
          {it.m ? <div className="text-body-small text-typography-secondary">{it.m}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-h3 mb-4 mt-12 text-typography-primary max-lg:mb-0 max-lg:mt-4">{children}</h2>;
}

export function OverviewTop() {
  const latestDay = fmtDate(END, "D", true);
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading>
        <Trans>Latest day · {latestDay} (UTC)</Trans>
      </SectionHeading>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <VolumeHeroCard />
        <StatSparkCard title={t`Open interest`} a={OI_TOTAL} unit="usd" note={t`End of day, last 30 days.`} />
        <FeesHeroCard />
      </div>
      <SectionHeading>
        <Trans>All-time</Trans>
      </SectionHeading>
      <StatRow items={allTimeItems()} />
    </div>
  );
}

function allTimeItems(): StatItem[] {
  return [
    { k: t`Total users`, v: fmtCompact(ALL_TIME.users, "count", 2), m: t`Wallets, not people` },
    { k: t`Total volume`, v: fmtCompact(ALL_TIME.volume, "usd", 2), m: t`Perps and swaps, all chains` },
    { k: t`Total fees`, v: fmtCompact(ALL_TIME.fees, "usd", 2), m: t`Gross, funding excluded` },
  ];
}
