import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type DateRange,
  toCalendarDateByUtcDay,
  toUtcDayEndByCalendarDate,
  toUtcDayStartByCalendarDate,
} from "lib/dates";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import {
  ACTIVE_BAR,
  ACTIVE_DOT,
  AXIS_TICK,
  BandCursor,
  BAR_RADIUS_ALL,
  BAR_RADIUS_TOP,
  BAR_RADIUS_TOP_THIN,
  CHART_MARGIN,
  ChartTip,
  ChartTipRow,
  GRID_PROPS,
  LINE_CURSOR,
  PanelLabel,
  PARTIAL_OPACITY,
  TOOLTIP_WRAPPER_STYLE,
} from "./StatsChartParts";
import {
  InfoTitle,
  LegendChip,
  RangeButton,
  Segmented,
  SegToggle,
  TbdBadge,
  TextButton,
  type SegOption,
} from "./StatsControls";
import {
  aggregate,
  bucketEnd,
  CHART_COLORS,
  type ChartCardConfig,
  type ChartType,
  DAYS,
  END,
  fmtCompact,
  fmtDate,
  fmtFull,
  fmtPct,
  type Grain,
  idxOf,
  N,
  sliceRows,
  type StatsRow,
  type StatsSeries,
} from "./statsData";
import { StatsStatus, useStatsDataState } from "./statsDataState";
import { StatsRangeSelector } from "./StatsRangeSelector";

type Domain = [number | string, number | string];
const DOMAIN_PCT: Domain = [0, 100];
const DOMAIN_AUTO: Domain = ["auto", "auto"];
const DOMAIN_FROM_ZERO: Domain = [0, "auto"];

function typeLabel(type: ChartType) {
  switch (type) {
    case "stackedBar":
      return t`Stacked bar`;
    case "bar":
      return t`Bar`;
    case "line":
      return t`Line`;
    case "area":
      return t`Area`;
    case "pct":
      return t`% share`;
    case "barCum":
      return t`Bar + cumulative line`;
    default:
      return t`Net flow bars + total line`;
  }
}

function grainOptions(grains: Grain[]): SegOption<Grain>[] {
  const all: SegOption<Grain>[] = [
    { id: "D", label: t({ message: "D", comment: "Chart granularity button: one bar per day" }), title: t`Day` },
    { id: "W", label: t({ message: "W", comment: "Chart granularity button: one bar per week" }), title: t`Week` },
    { id: "M", label: t({ message: "M", comment: "Chart granularity button: one bar per month" }), title: t`Month` },
    { id: "Y", label: t({ message: "Y", comment: "Chart granularity button: one bar per year" }), title: t`Year` },
  ];
  return all.map((o) => ({ ...o, disabled: !grains.includes(o.id) }));
}

type ViewRow = StatsRow & { cum?: number; _px?: number };

const num = (r: ViewRow, k: string) => (r[k] as number) ?? 0;

export function StatsChartCard({ cfg }: { cfg: ChartCardConfig }) {
  const dataState = useStatsDataState();
  const grains = cfg.grains || ["D", "W", "M", "Y"];
  const [grain, setGrain] = useState<Grain>(grains.includes("W") ? "W" : grains[0]);
  const [type, setType] = useState<ChartType>(cfg.types[0]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [range, setRange] = useState<DateRange | null>(null);
  const [table, setTable] = useState(false);
  const [variant, setVariant] = useState<string | null>(cfg.variants ? cfg.variants[0].id : null);

  const src = cfg.variants ? cfg.variants.find((v) => v.id === variant)! : null;
  const series: StatsSeries[] = src ? src.series : cfg.series!;
  const fromIdx = src?.fromIdx ?? cfg.fromIdx ?? 0;

  const rows = useMemo(() => {
    const given = cfg.rowsByGrain?.[grain];
    const r = (given ? given.map((x) => ({ ...x })) : aggregate(series, cfg.kind, grain, fromIdx)) as ViewRow[];
    if (cfg.cumulative) {
      let c = 0;
      for (const x of r) {
        c += series.reduce((a, s) => a + num(x, s.key), 0);
        x.cum = c;
      }
    }
    const price = cfg.usdPrice;
    if (price) {
      for (const x of r) {
        const a = idxOf(x.d);
        const b = Math.min(N - 1, idxOf(bucketEnd(x.d, grain)));
        let s = 0;
        for (let i = a; i <= b; i++) s += price[i];
        x._px = s / (b - a + 1);
      }
    }
    return r;
  }, [series, grain, fromIdx, cfg.kind, cfg.cumulative, cfg.usdPrice, cfg.rowsByGrain]);

  // The date range holds calendar dates (the picker's UTC days); rows are keyed by UTC seconds.
  const firstTs = DAYS[fromIdx];
  const from = range?.[0] ? Math.max(firstTs, toUtcDayStartByCalendarDate(range[0])) : firstTs;
  const to = range?.[1] ? Math.min(END, toUtcDayEndByCalendarDate(range[1])) : END;
  const [si, ei] = sliceRows(rows, grain, from, to);

  let shown = series.filter((s) => !hidden.has(s.key));
  if (cfg.composite && (type === "line" || type === "area")) shown = series.filter((s) => s.key === "total");
  const shownKey = shown.map((s) => s.key).join();

  const view = useMemo(
    () =>
      rows.slice(si, ei + 1).map((r) => {
        const o: ViewRow = { ...r };
        let total = 0;
        for (const s of shown) total += num(r, s.key);
        o._t = total;
        for (const s of shown) o[s.key + "Pct"] = total ? (num(r, s.key) / total) * 100 : 0;
        return o;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, si, ei, shownKey]
  );

  const toggle = (k: string) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else if (series.length - n.size > 1) n.add(k);
      return n;
    });

  const pct = type === "pct";
  const pctArea = cfg.types[0] === "area" || cfg.pctStyle === "area";
  const lastRow = view.length ? view[view.length - 1] : null;
  const partialRow = lastRow && lastRow.p ? lastRow : null;
  const narrow = (cfg.kind === "stock" && type === "line") || type === "flowTotal";
  const yFmt = (v: number) => (pct ? Math.round(v) + "%" : fmtCompact(v, cfg.unit, narrow ? 2 : undefined));
  const lineLike = type === "line" || type === "area" || (pct && pctArea);
  const cursor = lineLike ? LINE_CURSOR : <BandCursor count={view.length} />;

  const xAxis = (
    <XAxis
      dataKey="d"
      tickFormatter={(v: number) => fmtDate(v, grain)}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      minTickGap={24}
      tickMargin={8}
    />
  );
  const yAxis = (domain?: Domain, plainFmt?: boolean) => (
    <YAxis
      tickFormatter={plainFmt ? (v: number) => fmtCompact(v, cfg.unit) : yFmt}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      width={56}
      domain={domain}
      allowDataOverflow={false}
    />
  );
  const tooltip = (
    <Tooltip
      cursor={cursor}
      isAnimationActive={false}
      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
      content={<CardTip grain={grain} cfg={cfg} shown={shown} type={type} />}
    />
  );
  const partialLine =
    partialRow && lineLike ? (
      <ReferenceLine x={partialRow.d} stroke="var(--color-slate-500)" strokeDasharray="2 4" />
    ) : null;

  const thin = view.length > 60;
  const barMarks = (keys: StatsSeries[], suffix = "") => {
    const top = keys[keys.length - 1]?.key;
    return keys.map((s) => (
      <Bar
        key={s.key}
        dataKey={s.key + suffix}
        name={s.label}
        stackId="a"
        fill={s.color}
        stroke="var(--color-slate-900)"
        strokeWidth={keys.length > 1 && !thin ? 1 : 0}
        radius={s.key === top ? (thin ? BAR_RADIUS_TOP_THIN : BAR_RADIUS_TOP) : 0}
        maxBarSize={26}
        isAnimationActive={false}
        activeBar={ACTIVE_BAR}
      >
        {view.map((r, i) => (
          <Cell key={i} fillOpacity={r.p ? PARTIAL_OPACITY : 1} />
        ))}
      </Bar>
    ));
  };
  const lineMarks = (keys: StatsSeries[]) =>
    keys.map((s) => (
      <Line
        key={s.key}
        dataKey={s.key}
        name={s.label}
        type="monotone"
        stroke={s.color}
        strokeWidth={2}
        dot={false}
        activeDot={ACTIVE_DOT}
        isAnimationActive={false}
      />
    ));
  const areaMarks = (keys: StatsSeries[], suffix = "") =>
    keys.map((s) => (
      <Area
        key={s.key}
        dataKey={s.key + suffix}
        name={s.label}
        type="monotone"
        stackId="a"
        stroke={s.color}
        strokeWidth={2}
        fill={s.color}
        fillOpacity={0.16}
        activeDot={ACTIVE_DOT}
        isAnimationActive={false}
      />
    ));

  let plot;
  if (dataState !== "ready") {
    plot = <StatsStatus state={dataState} className="min-h-[260px] flex-1" />;
  } else if (type === "barCum" || type === "flowTotal") {
    const isCum = type === "barCum";
    const k = shown[0];
    plot = (
      <div className="flex flex-1 flex-col gap-4">
        <PanelLabel>{isCum ? <Trans>Cumulative</Trans> : <Trans>Total staked (end of period)</Trans>}</PanelLabel>
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={view} syncId={cfg.id} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID_PROPS} />
            {/* band scale: line points sit at the centre of each bar slot, like the bars in the panel below */}
            <XAxis dataKey="d" hide scale="band" />
            {yAxis(isCum ? undefined : DOMAIN_AUTO)}
            <Tooltip content={() => null} cursor={LINE_CURSOR} />
            <Line
              dataKey={isCum ? "cum" : "total"}
              type="monotone"
              stroke={isCum ? CHART_COLORS.muted : CHART_COLORS.s1}
              strokeWidth={2}
              dot={false}
              activeDot={ACTIVE_DOT}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <PanelLabel>{isCum ? cfg.periodLabel || t`Per period` : t`Net flow (stake minus unstake)`}</PanelLabel>
        {/* the lower panel stretches when the card next to it is taller */}
        <div className="relative min-h-[140px] flex-1">
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={view} syncId={cfg.id} margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} />
                {xAxis}
                {yAxis(undefined, true)}
                {tooltip}
                {isCum ? (
                  barMarks([k])
                ) : (
                  <>
                    <ReferenceLine y={0} stroke="var(--color-slate-600)" />
                    <Bar
                      dataKey="flow"
                      maxBarSize={26}
                      radius={BAR_RADIUS_ALL}
                      isAnimationActive={false}
                      activeBar={ACTIVE_BAR}
                    >
                      {view.map((r, i) => (
                        <Cell
                          key={i}
                          fill={num(r, "flow") >= 0 ? CHART_COLORS.pos : CHART_COLORS.neg}
                          fillOpacity={r.p ? PARTIAL_OPACITY : 1}
                        />
                      ))}
                    </Bar>
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  } else {
    let marks;
    if (type === "stackedBar" || type === "bar") marks = barMarks(shown);
    else if (type === "line") marks = lineMarks(shown);
    else if (type === "area") marks = areaMarks(shown);
    else marks = pctArea ? areaMarks(shown, "Pct") : barMarks(shown, "Pct");
    const domain = pct ? DOMAIN_PCT : cfg.kind === "stock" && type === "line" ? DOMAIN_AUTO : DOMAIN_FROM_ZERO;
    // the plot stretches when the card next to it is taller, so range selectors line up across a row
    plot = (
      <div className="relative min-h-[260px] flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={view} margin={CHART_MARGIN} barCategoryGap={thin ? "6%" : "18%"}>
              <CartesianGrid {...GRID_PROPS} />
              {xAxis}
              {yAxis(domain)}
              {tooltip}
              {marks}
              {partialLine}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const mini = rows.map((r) => ({
    d: r.d,
    t: cfg.composite ? num(r, "total") : shown.reduce((a, s) => a + Math.max(0, num(r, s.key)), 0),
  }));
  const composite = type === "flowTotal" || cfg.composite;
  const tableKeys = composite || type === "barCum" ? (cfg.composite ? series : [shown[0]]) : shown;
  const showLegend = series.length > 1 && !cfg.composite;
  const noteText = [
    cfg.note,
    cfg.kind === "stock" || cfg.composite ? t`Stocks show the end-of-period value.` : null,
    cfg.kind === "unique"
      ? t`Wallets are counted once per period (not a sum of days); EVM and Solana wallets are separate.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const typeOptions: SegOption<ChartType>[] = cfg.types.map((ct) => ({ id: ct, icon: ct, title: typeLabel(ct) }));

  return (
    <section
      className={cx("flex min-w-0 flex-col gap-12 rounded-8 bg-slate-900 p-adaptive", { "lg:col-span-2": cfg.span2 })}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-12">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-8">
            <InfoTitle
              heading
              title={cfg.title}
              note={noteText}
              className="text-h3 font-medium text-typography-primary max-md:text-body-medium"
            />
            {cfg.badge ? <TbdBadge>{cfg.badge}</TbdBadge> : null}
          </div>
          {cfg.breakdown ? <div className="text-body-small text-typography-secondary">{cfg.breakdown}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-8">
          {cfg.variants ? (
            <Segmented
              label={cfg.variantSeg ?? t`Vault`}
              options={cfg.variants.map((v) => ({ id: v.id, label: v.shortLabel ?? v.label }))}
              value={variant}
              onChange={(v) => {
                setVariant(v);
                setHidden(new Set());
              }}
            />
          ) : null}
          {cfg.types.length > 1 ? (
            <Segmented label={t`Chart type`} options={typeOptions} value={type} onChange={setType} />
          ) : null}
          <Segmented label={t`Granularity`} options={grainOptions(grains)} value={grain} onChange={setGrain} />
          <RangeButton range={range} onChange={setRange} />
          <SegToggle icon="table" on={table} onToggle={() => setTable((x) => !x)} label={t`Table view`} />
        </div>
      </div>

      {showLegend ? (
        <div className="-mx-8 flex flex-wrap items-center gap-4" role="group" aria-label={t`Breakdown`}>
          {series.map((s) => (
            <LegendChip
              key={s.key}
              label={s.label}
              color={s.color}
              off={hidden.has(s.key)}
              onClick={() => toggle(s.key)}
            />
          ))}
          {series.length > 2 && hidden.size > 0 ? (
            <TextButton onClick={() => setHidden(new Set())}>
              <Trans>Show all</Trans>
            </TextButton>
          ) : null}
        </div>
      ) : null}

      {table && dataState === "ready" ? (
        <div className="-mx-16 max-h-[300px] overflow-auto md:-mx-20">
          <Table>
            <thead className="sticky top-0 bg-slate-900">
              <TableTheadTr>
                <TableTh>
                  <Trans>Period</Trans>
                </TableTh>
                {tableKeys.map((s) => (
                  <TableTh key={s.key} className="!text-right">
                    {s.label}
                  </TableTh>
                ))}
                {tableKeys.length > 1 && !cfg.composite ? (
                  <TableTh className="!text-right">
                    <Trans>Total</Trans>
                  </TableTh>
                ) : null}
                {type === "barCum" ? (
                  <TableTh className="!text-right">
                    <Trans>Cumulative</Trans>
                  </TableTh>
                ) : null}
              </TableTheadTr>
            </thead>
            <tbody>
              {view
                .slice()
                .reverse()
                .map((r) => (
                  <TableTr key={r.d}>
                    <TableTd className="whitespace-nowrap">
                      {fmtDate(r.d, grain, true)}
                      {r.p ? (
                        <span className="text-typography-secondary">
                          {" "}
                          <Trans>(partial)</Trans>
                        </span>
                      ) : null}
                    </TableTd>
                    {tableKeys.map((s) => (
                      <TableTd key={s.key} className="whitespace-nowrap text-right numbers">
                        {fmtFull(num(r, s.key), cfg.unit)}
                      </TableTd>
                    ))}
                    {tableKeys.length > 1 && !cfg.composite ? (
                      <TableTd className="whitespace-nowrap text-right numbers">
                        {fmtFull(
                          tableKeys.reduce((a, s) => a + num(r, s.key), 0),
                          cfg.unit
                        )}
                      </TableTd>
                    ) : null}
                    {type === "barCum" ? (
                      <TableTd className="whitespace-nowrap text-right numbers">
                        {fmtFull(r.cum ?? 0, cfg.unit)}
                      </TableTd>
                    ) : null}
                  </TableTr>
                ))}
            </tbody>
          </Table>
        </div>
      ) : (
        plot
      )}

      {dataState === "ready" ? (
        <div className="mt-auto">
          <StatsRangeSelector
            values={mini.map((m) => m.t)}
            start={si}
            end={ei}
            formatLabel={(i) => fmtDate(rows[i].d, grain, true)}
            onChange={(s, e) =>
              setRange([
                toCalendarDateByUtcDay(new Date(rows[s].d * 1000)),
                toCalendarDateByUtcDay(new Date(Math.min(END, bucketEnd(rows[e].d, grain)) * 1000)),
              ])
            }
          />
        </div>
      ) : null}
    </section>
  );
}

function CardTip({
  active,
  payload,
  grain,
  cfg,
  shown,
  type,
}: {
  active?: boolean;
  payload?: { payload: ViewRow }[];
  grain: Grain;
  cfg: ChartCardConfig;
  shown: StatsSeries[];
  type: ChartType;
}) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  const unit = cfg.unit;
  const period = fmtDate(r.d, grain, true);
  const head = r.p ? t`${period} · partial` : period;
  if (type === "barCum") {
    const k = shown[0];
    return (
      <ChartTip head={head}>
        <ChartTipRow label={cfg.periodLabel || t`This period`} value={fmtFull(num(r, k.key), unit)} color={k.color} />
        <ChartTipRow label={t`Cumulative`} value={fmtFull(r.cum ?? 0, unit)} color={CHART_COLORS.muted} />
        {cfg.usdPrice ? (
          <ChartTipRow label={t`USD estimate`} value={fmtFull(num(r, k.key) * (r._px || 0), "usd")} />
        ) : null}
      </ChartTip>
    );
  }
  if (type === "flowTotal") {
    const flow = num(r, "flow");
    return (
      <ChartTip head={head}>
        <ChartTipRow
          label={t`Total staked (end of period)`}
          value={fmtFull(num(r, "total"), unit)}
          color={CHART_COLORS.s1}
        />
        <ChartTipRow
          label={t`Net flow`}
          value={fmtFull(flow, unit)}
          color={flow >= 0 ? CHART_COLORS.pos : CHART_COLORS.neg}
        />
      </ChartTip>
    );
  }
  const pct = type === "pct";
  const total = shown.reduce((a, s) => a + num(r, s.key), 0);
  return (
    <ChartTip head={head}>
      {shown
        .slice()
        .reverse()
        .map((s) => (
          <ChartTipRow
            key={s.key}
            label={s.label}
            color={shown.length > 1 ? s.color : undefined}
            value={pct ? fmtPct(num(r, s.key + "Pct")) : fmtFull(num(r, s.key), unit)}
          />
        ))}
      {shown.length > 1 && !pct ? <ChartTipRow total label={t`Total`} value={fmtFull(total, unit)} /> : null}
    </ChartTip>
  );
}
