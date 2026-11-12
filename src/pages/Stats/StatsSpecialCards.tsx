import { plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type ReactNode, useMemo, useState } from "react";
import { ResponsiveContainer, Sankey, Tooltip, Treemap } from "recharts";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import { ChartTip, ChartTipRow, TOOLTIP_WRAPPER_STYLE } from "./StatsChartParts";
import { InfoTitle, LegendChip, PeriodSelect, Segmented, SegToggle, TbdBadge, type SegOption } from "./StatsControls";
import {
  bucketEnd,
  bucketStart,
  BUYBACK_START,
  CHAINS,
  type ChainKey,
  CHART_COLORS,
  DAYS,
  END,
  FEE_SPLIT,
  type FeeType,
  fmtAddress,
  fmtCompact,
  fmtDate,
  fmtFull,
  fmtPct,
  getTreasuryGroups,
  getTreasuryNote,
  GMX_TOKEN,
  type Grain,
  HOLDERS,
  type HolderType,
  M,
  N,
  TOP_USERS,
  type TopPeriod,
  TVL_TOTAL,
} from "./statsData";
import { NO_VALUE, StatsStatus, useStatsDataState } from "./statsDataState";
import { type StatItem, StatRow, StatSparkCard } from "./StatsOverview";

/* ---------------- shared card head ---------------- */
function CardHead({
  title,
  note,
  badge,
  eyebrow,
  tools,
}: {
  title: string;
  note?: string;
  badge?: string;
  eyebrow?: string;
  tools?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-12">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-8">
          <InfoTitle
            heading
            title={title}
            note={note}
            className="text-h3 font-medium text-typography-primary max-md:text-body-medium"
          />
          {badge ? <TbdBadge>{badge}</TbdBadge> : null}
        </div>
        {eyebrow ? <div className="text-body-small text-typography-secondary">{eyebrow}</div> : null}
      </div>
      {tools ? <div className="flex flex-wrap items-center gap-8">{tools}</div> : null}
    </div>
  );
}

function Card({ children, span2 }: { children: ReactNode; span2?: boolean }) {
  return (
    <section
      className={cx("flex min-w-0 flex-col gap-12 rounded-8 bg-slate-900 p-adaptive", { "lg:col-span-2": span2 })}
    >
      {children}
    </section>
  );
}

const SCROLL_TABLE = "-mx-16 max-h-[360px] overflow-auto md:-mx-20";

/** A coloured dot with its style kept stable between renders. */
function Dot({ color, className }: { color: string; className?: string }) {
  const style = useMemo(() => ({ background: color }), [color]);
  return <span className={cx("size-8 shrink-0 rounded-full", className)} style={style} />;
}

/* ---------------- top users ---------------- */
function topPeriodOptions(): SegOption<TopPeriod>[] {
  return [
    { id: "7D", label: t({ message: "7D", comment: "Period button: the last 7 days" }), title: t`Last 7 days` },
    { id: "30D", label: t({ message: "30D", comment: "Period button: the last 30 days" }), title: t`Last 30 days` },
    { id: "All", label: t`All`, title: t`All time` },
  ];
}

export function TopUsersCard() {
  const dataState = useStatsDataState();
  const [p, setP] = useState<TopPeriod>("30D");
  const rows = TOP_USERS.slice()
    .sort((a, b) => b.volume[p] - a.volume[p])
    .slice(0, 20);
  const days = p === "7D" ? 7 : 30;
  return (
    <Card>
      <CardHead
        title={t`Top users by volume`}
        note={t`Addresses only, no labels. A wallet on two EVM chains appears once (EVM addresses are merged).`}
        badge={t`Period TBD`}
        eyebrow={
          p === "All"
            ? t`Top 20 · all time`
            : plural(days, { one: "Top 20 · last # day", other: "Top 20 · last # days" })
        }
        tools={<Segmented label={t`Period`} options={topPeriodOptions()} value={p} onChange={setP} />}
      />
      {dataState === "ready" ? (
        <div className={SCROLL_TABLE}>
          <Table>
            <thead className="sticky top-0 z-[1] bg-slate-900">
              <TableTheadTr>
                <TableTh>#</TableTh>
                <TableTh>
                  <Trans>Address</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Chain</Trans>
                </TableTh>
                <TableTh className="!text-right">
                  <Trans>Volume</Trans>
                </TableTh>
                <TableTh className="!text-right">
                  <Trans>Trades</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <TableTr key={r.address}>
                  <TableTd className="text-typography-secondary numbers">{i + 1}</TableTd>
                  <TableTd className="whitespace-nowrap font-medium" title={r.address}>
                    {fmtAddress(r.address)}
                  </TableTd>
                  <TableTd className="text-typography-secondary">{r.chain}</TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">{fmtFull(r.volume[p], "usd")}</TableTd>
                  <TableTd className="text-right numbers">{fmtFull(r.trades[p], "count")}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <StatsStatus state={dataState} className="min-h-[240px]" />
      )}
    </Card>
  );
}

/* ---------------- GMX holders map ---------------- */
type HoldPart = { key: "staked" | "free" | "liq"; label: string; color: string };

function holdPartDefs(): HoldPart[] {
  return [
    { key: "staked", label: t`Staked`, color: CHART_COLORS.s1 },
    { key: "free", label: t`Not staked`, color: CHART_COLORS.s3 },
    { key: "liq", label: t`In liquidity (LP pools)`, color: CHART_COLORS.s2 },
  ];
}

function holderTypeLabel(type: HolderType | "other") {
  switch (type) {
    case "wallet":
      return t`Wallet`;
    case "treasury":
      return t`Treasury`;
    case "exchange":
      return t`Exchange`;
    case "lp":
      return t`LP pool`;
    default:
      return t`Rest of supply`;
  }
}

type HolderDatum = { name: string; full?: string; size: number; staked: number; type: HolderType | "other" };

const holdParts = (d: HolderDatum, parts: HoldPart[]) =>
  d.type === "lp"
    ? [{ p: parts[2], v: d.size }]
    : [
        { p: parts[0], v: d.staked },
        { p: parts[1], v: d.size - d.staked },
      ];

// Labels sit on fixed chart colours, so they use black in both themes (the design system has no token for this yet).
const LABEL_ON_FILL = "var(--color-black)";

function TreeCell(
  p: HolderDatum & { x: number; y: number; width: number; height: number; depth: number },
  parts: HoldPart[],
  supply: number
) {
  const { x, y, width, height, depth, name } = p;
  if (depth !== 1 || !width || !height) return <g />;
  const shownParts = holdParts(p, parts).filter((q) => q.v > 0);
  const total = shownParts.reduce((a, q) => a + q.v, 0) || 1;
  const wide = width >= height;
  let off = 0;
  const rects = shownParts.map((q, i) => {
    const len = ((wide ? width : height) * q.v) / total;
    const r = wide ? { x: x + off, y, w: len, h: height } : { x, y: y + off, w: width, h: len };
    off += len;
    return <rect key={i} x={r.x} y={r.y} width={Math.max(0, r.w)} height={Math.max(0, r.h)} fill={q.p.color} />;
  });
  const show = width > 88 && height > 30;
  const share = fmtPct((p.size / supply) * 100);
  const stakedPct = Math.round((p.staked / p.size) * 100);
  return (
    <g>
      {rects}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="var(--color-slate-900)"
        strokeWidth={3}
        rx={4}
      />
      {show ? (
        <text x={x + 8} y={y + 18} fill={LABEL_ON_FILL} fontSize={12} fontWeight={600}>
          {name}
        </text>
      ) : null}
      {show && height > 44 ? (
        <text x={x + 8} y={y + 34} fill={LABEL_ON_FILL} fontSize={11} fontWeight={500}>
          {p.type === "lp" ? share : t`${share} · ${stakedPct}% staked`}
        </text>
      ) : null}
    </g>
  );
}

function holderViewOptions(): SegOption<"treemap" | "table">[] {
  return [
    { id: "treemap", icon: "treemap", title: t`Map` },
    { id: "table", icon: "table", title: t`Table` },
  ];
}

function topNOptions(): SegOption<"20" | "50">[] {
  return [
    { id: "20", label: t`Top 20` },
    { id: "50", label: t`Top 50` },
  ];
}

export function HoldersCard() {
  const dataState = useStatsDataState();
  const ready = dataState === "ready";
  const [topN, setTopN] = useState<"20" | "50">("20");
  const [view, setView] = useState<"treemap" | "table">("treemap");
  const parts = holdPartDefs();
  const supply = GMX_TOKEN.supply;
  const n = +topN;
  const otherName = t`Other holders`;
  const data = useMemo(() => {
    const top = HOLDERS.slice(0, n);
    const otherSize = supply - top.reduce((a, h) => a + h.gmx, 0);
    const otherStaked = Math.max(0, Math.min(otherSize, M.gmxStaked[N - 1] - top.reduce((a, h) => a + h.staked, 0)));
    const out: HolderDatum[] = top.map((h) => ({
      name: fmtAddress(h.address),
      full: h.address,
      size: h.gmx,
      staked: h.staked,
      type: h.type,
    }));
    out.push({ name: otherName, size: otherSize, staked: otherStaked, type: "other" });
    return out;
  }, [n, supply, otherName]);
  const supplyText = ready ? fmtFull(supply, "gmx") : NO_VALUE;
  return (
    <Card>
      <CardHead
        title={t`GMX holders map`}
        note={t`Each square is one holder, sized by the GMX it holds. The blue part is staked GMX and the yellow part is GMX not staked. LP pools can't stake, so their squares are green. Staked GMX is counted under its owner, so the staking contract is not one giant square. Addresses only.`}
        badge={t`Labels TBD`}
        eyebrow={t`Current snapshot · Arbitrum and Avalanche · ${supplyText}`}
        tools={
          <>
            <Segmented label={t`View`} options={holderViewOptions()} value={view} onChange={setView} />
            <Segmented label={t`Top N`} options={topNOptions()} value={topN} onChange={setTopN} />
          </>
        }
      />
      <div className="-mx-8 flex flex-wrap gap-4">
        {parts.map((part) => (
          <span key={part.key} className="px-8">
            <LegendChip label={part.label} color={part.color} />
          </span>
        ))}
      </div>
      {!ready ? (
        <StatsStatus state={dataState} className="h-[330px]" />
      ) : view === "treemap" ? (
        <ResponsiveContainer width="100%" height={330}>
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            isAnimationActive={false}
            content={((p: never) => TreeCell(p, parts, supply)) as never}
          >
            <Tooltip
              isAnimationActive={false}
              wrapperStyle={TOOLTIP_WRAPPER_STYLE}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as HolderDatum;
                return (
                  <ChartTip head={d.full || d.name}>
                    <ChartTipRow label={holderTypeLabel(d.type)} value={fmtFull(d.size, "gmx")} />
                    {holdParts(d, parts).map((q) => (
                      <ChartTipRow
                        key={q.p.key}
                        label={q.p.label}
                        color={q.p.color}
                        value={fmtFull(q.v, "gmx") + " (" + fmtPct((q.v / d.size) * 100) + ")"}
                      />
                    ))}
                    <ChartTipRow total label={t`Share of supply`} value={fmtPct((d.size / supply) * 100)} />
                  </ChartTip>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      ) : (
        <div className={SCROLL_TABLE}>
          <Table>
            <thead className="sticky top-0 z-[1] bg-slate-900">
              <TableTheadTr>
                <TableTh>#</TableTh>
                <TableTh>
                  <Trans>Holder</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Type</Trans>
                </TableTh>
                <TableTh className="!text-right">GMX</TableTh>
                <TableTh className="!text-right">
                  <Trans>Staked</Trans>
                </TableTh>
                <TableTh className="!text-right">
                  <Trans>Not staked</Trans>
                </TableTh>
                <TableTh className="!text-right">
                  <Trans>Share</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <TableTr key={d.name + i}>
                  <TableTd className="text-typography-secondary numbers">{i < n ? i + 1 : ""}</TableTd>
                  <TableTd className="whitespace-nowrap font-medium">{d.name}</TableTd>
                  <TableTd className="text-typography-secondary">
                    {d.type === "other" ? NO_VALUE : holderTypeLabel(d.type)}
                  </TableTd>
                  <TableTd className="text-right numbers">{fmtFull(d.size, "count")}</TableTd>
                  <TableTd className="text-right numbers">
                    {d.type === "lp" ? NO_VALUE : fmtFull(d.staked, "count")}
                  </TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">
                    {d.type === "lp" ? <Trans>In liquidity</Trans> : fmtFull(d.size - d.staked, "count")}
                  </TableTd>
                  <TableTd className="text-right numbers">{fmtPct((d.size / supply) * 100)}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}

/* ---------------- treasury ---------------- */
function treasuryKpiItems(): StatItem[] {
  let total = 0;
  for (const key of ["stable", "eth", "btc", "gmx", "other"] as const) total += M.treasury[key][N - 1];
  return [
    { k: t`Total treasury`, v: fmtFull(total, "usd"), m: t`Excludes the buyback reserve` },
    { k: t`Excluding GMX token`, v: fmtFull(total - M.treasury.gmx[N - 1], "usd") },
    { k: t`Stablecoins`, v: fmtFull(M.treasury.stable[N - 1], "usd"), m: t`Incl. GMX stablecoin pools` },
  ];
}

export function TreasuryKpis() {
  return <StatRow items={treasuryKpiItems()} />;
}

function HoldingRow({ label, color, value, share }: { label: string; color: string; value: number; share: number }) {
  const barStyle = useMemo(() => ({ width: share + "%", background: color }), [share, color]);
  return (
    <div className="flex flex-col gap-6">
      <div className="text-body-medium flex items-center justify-between gap-12">
        <span className="flex items-center gap-8 text-typography-secondary">
          <Dot color={color} />
          {label}
        </span>
        <span className="flex items-baseline gap-6 numbers">
          <span className="font-medium">{fmtCompact(value, "usd", 2)}</span>
          <span className="text-body-small text-typography-secondary">{fmtPct(share)}</span>
        </span>
      </div>
      <div className="h-6 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={barStyle} />
      </div>
    </div>
  );
}

export function HoldingsCard() {
  const dataState = useStatsDataState();
  const [group, setGroup] = useState("asset");
  const groups = getTreasuryGroups();
  const g = groups.find((x) => x.id === group) ?? groups[0];
  const rows = g.series.map((s) => ({ a: s, v: s.arr[N - 1] })).filter((r) => r.v > 0);
  const total = rows.reduce((sum, r) => sum + r.v, 0);
  const day = fmtDate(END, "D", true);
  return (
    <Card>
      <CardHead
        title={t`Holdings`}
        note={t`End of day ${day}.` + " " + getTreasuryNote()}
        tools={
          <Segmented
            label={t`Group by`}
            options={groups.map((x) => ({ id: x.id, label: x.label }))}
            value={group}
            onChange={setGroup}
          />
        }
      />
      {dataState === "ready" ? (
        <div className="flex flex-col gap-16 pt-4">
          {rows.map((r) => (
            <HoldingRow key={r.a.key} label={r.a.label} color={r.a.color} value={r.v} share={(r.v / total) * 100} />
          ))}
        </div>
      ) : (
        <StatsStatus state={dataState} className="min-h-[200px]" />
      )}
    </Card>
  );
}

/* ---------------- GMX token ---------------- */
function gmxTokenItems(): StatItem[] {
  const price = M.gmxPrice[N - 1];
  const staked = M.gmxStaked[N - 1];
  const supply = GMX_TOKEN.supply;
  return [
    { k: t`Price`, v: "$" + price.toFixed(2) },
    { k: t`Total supply`, v: fmtCompact(supply, "count", 2) },
    { k: t`Total staked`, v: fmtCompact(staked * price, "usd", 2), m: fmtCompact(staked, "count", 2) + " GMX" },
    { k: t`Market cap`, v: fmtCompact(price * supply, "usd", 2) },
  ];
}

function DistributionSegment({ label, share, color }: { label: string; share: number; color: string }) {
  const style = useMemo(() => ({ flex: share, background: color }), [share, color]);
  return <div title={label + ": " + fmtPct(share)} style={style} />;
}

export function GmxTokenTop() {
  const ready = useStatsDataState() === "ready";
  const { supply, liquidityPct } = GMX_TOKEN;
  const stakedPct = (M.gmxStaked[N - 1] / supply) * 100;
  const liqPct = liquidityPct.uniswap + liquidityPct.traderJoe + liquidityPct.gmxV2;
  const segs = [
    { k: "staked", label: t`Staked`, v: stakedPct, c: CHART_COLORS.s1 },
    { k: "free", label: t`Not staked`, v: 100 - stakedPct - liqPct, c: CHART_COLORS.s3 },
    { k: "liq", label: t`In liquidity`, v: liqPct, c: CHART_COLORS.s2 },
  ];
  const pct = (v: number) => (ready ? fmtPct(v) : NO_VALUE);
  const uniswap = pct(liquidityPct.uniswap);
  const traderJoe = pct(liquidityPct.traderJoe);
  const gmxV2 = pct(liquidityPct.gmxV2);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <StatRow twoCols items={gmxTokenItems()} />
      </div>
      <Card>
        <CardHead title={t`GMX distribution`} note={t`Share of total supply, Arbitrum and Avalanche.`} />
        <div className="grid grid-cols-3 gap-12">
          {segs.map((s) => (
            <div key={s.k} className="flex flex-col gap-2">
              <span className="text-body-small flex items-center gap-6 text-typography-secondary">
                <Dot color={s.c} />
                {s.label}
              </span>
              <span className="text-h3 numbers">{pct(s.v)}</span>
            </div>
          ))}
        </div>
        {ready ? (
          <div
            className="flex h-8 gap-2 overflow-hidden rounded-full"
            role="img"
            aria-label={segs.map((x) => x.label + " " + fmtPct(x.v)).join(", ")}
          >
            {segs.map((x) => (
              <DistributionSegment key={x.k} label={x.label} share={x.v} color={x.c} />
            ))}
          </div>
        ) : (
          <div className="h-8 rounded-full bg-slate-800" />
        )}
        <div className="text-body-small text-typography-secondary">
          <Trans>
            In liquidity: Uniswap {uniswap} · TraderJoe {traderJoe} · GMX V2 {gmxV2}
          </Trans>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- buyback ---------------- */
function buybackKpiItems(): StatItem[] {
  let w = 0;
  let wUsd = 0;
  let tot = 0;
  let w4 = 0;
  for (let i = 0; i < N; i++) tot += M.buyback[i];
  for (let i = N - 7; i < N; i++) {
    w += M.buyback[i];
    wUsd += M.buyback[i] * M.gmxPrice[i];
  }
  for (let i = N - 28; i < N; i++) w4 += M.buyback[i];
  const supply = GMX_TOKEN.supply;
  const startDay = fmtDate(BUYBACK_START, "D", true);
  return [
    { k: t`Weekly bought GMX`, v: fmtFull(w, "count"), sub: fmtFull(wUsd, "usd"), m: t`Last 7 days` },
    {
      k: t`Buyback reserve`,
      v: fmtFull(tot, "count"),
      sub: fmtFull(tot * M.gmxPrice[N - 1], "usd"),
      m: t`GMX bought since ${startDay}, held for stakers. At today’s price; not part of Treasury.`,
    },
    { k: t`Weekly rate`, v: ((w / supply) * 100).toFixed(2) + "%", m: t`Weekly bought ÷ total supply` },
    {
      k: t`Annualized rate`,
      v: ((((w4 / 4) * 52) / supply) * 100).toFixed(1) + "%",
      m: t`Avg of last 4 weeks × 52 ÷ supply`,
    },
  ];
}

export function BuybackKpis() {
  return <StatRow items={buybackKpiItems()} />;
}

/* ---------------- liquidity ---------------- */
export function TvlTotal() {
  // full width, as in the PM's prototype
  return (
    <StatSparkCard
      title={t`Total TVL`}
      a={TVL_TOTAL}
      unit="usd"
      meta={t`GM pool value, all chains (EVM and Solana) · end of day`}
    />
  );
}

/* ---------------- fee flow (sankey) ---------------- */
const FEE_TYPE_KEYS: FeeType[] = ["oc", "borrow", "liq", "swap"];

function feeTypeLabel(type: FeeType) {
  switch (type) {
    case "oc":
      return t`Open/close fees`;
    case "borrow":
      return t`Borrowing fees`;
    case "liq":
      return t`Liquidation fees`;
    default:
      return t`Swap fees`;
  }
}

type FlowOut = { key: string; name: string; from: Partial<Record<ChainKey, number>> };

function flowOutputs(): FlowOut[] {
  return [
    { key: "lp", name: t`LPs (GM pools)`, from: { evm: FEE_SPLIT.evm.lp, sol: FEE_SPLIT.sol.lp } },
    { key: "stakers", name: t`Stakers (buys GMX)`, from: { evm: FEE_SPLIT.evm.stakers } },
    { key: "treasury", name: t`Treasury`, from: { evm: FEE_SPLIT.evm.treasury } },
    { key: "chainlink", name: "Chainlink", from: { evm: FEE_SPLIT.evm.chainlink } },
    { key: "gt", name: t`GT buyback (Solana)`, from: { sol: FEE_SPLIT.sol.gt } },
  ];
}

const FLOW_CHAINS = CHAINS.map((c) => ({ ...c, fee: M.feesByChain[c.key] }));
const SANKEY_MARGIN = { top: 44, right: 190, bottom: 20, left: 200 };

type FlowGrain = "M" | "Q" | "Y" | "All";
type FlowNodeT = {
  key: string;
  name: string;
  side: "in" | "mid" | "out";
  color?: string;
  chain?: ChainKey;
  by?: Partial<Record<ChainKey, number>>;
  v: number;
};
/** What a Sankey node or link holds; Recharts hands it to the tooltip one level down, as payload.payload. */
type SankeyDatum = Partial<FlowNodeT> & { source?: FlowNodeT; target?: FlowNodeT; value?: number };

function periodSum(a: Float64Array, g: FlowGrain, b: number | null) {
  let sum = 0;
  for (let i = 0; i < N; i++) if (g === "All" || bucketStart(DAYS[i], g as Grain) === b) sum += a[i];
  return sum;
}

function buildFlow(g: FlowGrain, b: number | null) {
  const typeSums = {} as Record<FeeType, number>;
  for (const k of FEE_TYPE_KEYS) typeSums[k] = periodSum(M.feesByType[k], g, b);
  const typeTotal = FEE_TYPE_KEYS.reduce((sum, k) => sum + typeSums[k], 0);
  const byChain = {} as Record<ChainKey, number>;
  for (const c of FLOW_CHAINS) byChain[c.key] = periodSum(c.fee, g, b);
  const total = byChain.evm + byChain.sol;
  const inputs: FlowNodeT[] = [];
  for (const c of FLOW_CHAINS)
    for (const k of FEE_TYPE_KEYS) {
      const v = typeTotal ? (byChain[c.key] * typeSums[k]) / typeTotal : 0;
      if (v > 0)
        inputs.push({
          key: c.key + ":" + k,
          name: c.label + " · " + feeTypeLabel(k),
          side: "in",
          chain: c.key,
          color: c.color,
          v,
        });
    }
  const outputs: FlowNodeT[] = flowOutputs()
    .map((o) => {
      const by: Partial<Record<ChainKey, number>> = {};
      let v = 0;
      for (const c of FLOW_CHAINS) {
        const share = o.from[c.key];
        if (share) {
          by[c.key] = byChain[c.key] * share;
          v += by[c.key]!;
        }
      }
      return { key: o.key, name: o.name, side: "out" as const, by, v };
    })
    .filter((o) => o.v > 0);
  const mid: FlowNodeT = { key: "total", name: t`Total fees`, side: "mid", by: byChain, v: total };
  const nodes = [...inputs, mid, ...outputs];
  const m = inputs.length;
  const links = inputs
    .map((node, i) => ({ source: i, target: m, value: node.v }))
    .concat(outputs.map((node, i) => ({ source: m, target: m + 1 + i, value: node.v })));
  const rows = inputs
    .map((node) => ({
      from: node.name,
      to: mid.name,
      v: node.v,
      by: { [node.chain!]: node.v } as Partial<Record<ChainKey, number>>,
    }))
    .concat(outputs.map((node) => ({ from: mid.name, to: node.name, v: node.v, by: node.by! })));
  return { nodes, links, total, byChain, rows };
}

function FlowNode(
  p: { x: number; y: number; width: number; height: number; payload: FlowNodeT & { value: number } },
  total: number,
  compact: boolean
) {
  const { x, y, width, height, payload } = p;
  const pct = total ? (payload.value / total) * 100 : 0;
  const val = fmtCompact(payload.value, "usd", 2) + " · " + pct.toFixed(1) + "%";
  const fill = payload.side === "in" ? payload.color : "var(--color-slate-100)";
  const rect = <rect x={x} y={y} width={width} height={Math.max(1, height)} rx={2} fill={fill} />;
  if (payload.side === "mid")
    return (
      <g>
        {rect}
        <text
          x={x + width / 2}
          y={y - 24}
          textAnchor="middle"
          fontSize={13}
          fontWeight={500}
          fill="var(--color-typography-primary)"
        >
          {payload.name}
        </text>
        <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fill="var(--color-typography-secondary)">
          {fmtCompact(payload.value, "usd", 2)}
        </text>
      </g>
    );
  const left = payload.side === "in";
  const tx = left ? x - 8 : x + width + 8;
  const anchor = left ? "end" : "start";
  return (
    <g>
      {rect}
      <text
        x={tx}
        y={y + height / 2 - 2}
        textAnchor={anchor}
        fontSize={compact ? 12 : 13}
        fontWeight={500}
        fill="var(--color-typography-primary)"
      >
        {payload.name}
      </text>
      <text x={tx} y={y + height / 2 + 14} textAnchor={anchor} fontSize={12} fill="var(--color-typography-secondary)">
        {val}
      </text>
    </g>
  );
}

function FlowLink(p: {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  payload: { source: FlowNodeT };
}) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = p;
  const c = payload?.source?.side === "in" ? payload.source.color : null;
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={c || "var(--color-slate-500)"}
      strokeOpacity={c ? 0.3 : 0.45}
      strokeWidth={Math.max(1, linkWidth)}
    />
  );
}

function flowGrainOptions(): SegOption<FlowGrain>[] {
  return [
    { id: "M", label: t({ message: "M", comment: "Fee flow period button: one month" }), title: t`Month` },
    { id: "Q", label: t({ message: "Q", comment: "Fee flow period button: one quarter" }), title: t`Quarter` },
    { id: "Y", label: t({ message: "Y", comment: "Fee flow period button: one year" }), title: t`Year` },
    { id: "All", label: t`All`, title: t`All time` },
  ];
}

export function FeeFlowCard() {
  const dataState = useStatsDataState();
  const ready = dataState === "ready";
  const [g, setG] = useState<FlowGrain>("M");
  const [table, setTable] = useState(false);
  const periods = useMemo(() => {
    if (g === "All") return [];
    const out: number[] = [];
    let last: number | null = null;
    for (let i = 0; i < N; i++) {
      const b = bucketStart(DAYS[i], g);
      if (b !== last) {
        out.push(b);
        last = b;
      }
    }
    return out.reverse();
  }, [g]);
  const [sel, setSel] = useState<number | null>(null);
  const b = g === "All" ? null : sel !== null && periods.includes(sel) ? sel : periods[0];
  const flow = useMemo(() => buildFlow(g, b), [g, b]);
  const sankeyData = useMemo(() => ({ nodes: flow.nodes, links: flow.links }), [flow]);
  const total = flow.total;
  const pct = (v: number) => (total ? ((v / total) * 100).toFixed(1) + "%" : "–");
  const label = (x: number) => {
    const period = fmtDate(x, g as Grain, true);
    return bucketEnd(x, g as Grain) > END ? t`${period} (partial)` : period;
  };
  const totalText = ready ? fmtCompact(total, "usd", 2) : NO_VALUE;
  const periodText = b === null ? t`all time` : label(b);
  return (
    <Card span2>
      <CardHead
        title={t`Fee flow`}
        note={t`Where every dollar of trading fees goes. Inputs are coloured by chain; the split is applied per chain, then merged. EVM: 63% LPs · 27% buys GMX for stakers · 8.8% treasury · 1.2% Chainlink. Solana: ~99% GT buybacks · 1% LPs. Funding fees are excluded.`}
        eyebrow={t`${totalText} total fees · ${periodText}`}
        tools={
          <>
            {g !== "All" ? (
              <PeriodSelect
                label={t`Period`}
                options={periods.map((x) => ({ id: String(x), label: label(x) }))}
                value={String(b)}
                onChange={(v) => setSel(+v)}
              />
            ) : null}
            <Segmented
              label={t`Interval`}
              options={flowGrainOptions()}
              value={g}
              onChange={(x) => {
                setG(x);
                setSel(null);
              }}
            />
            <SegToggle icon="table" on={table} onToggle={() => setTable((x) => !x)} label={t`Table view`} />
          </>
        }
      />
      <div className="-mx-8 flex flex-wrap gap-4">
        {FLOW_CHAINS.map((c) => (
          <span key={c.key} className="px-8">
            <LegendChip
              label={c.label}
              color={c.color}
              extra={
                ready ? (
                  <span className="text-typography-primary numbers">
                    {fmtCompact(flow.byChain[c.key], "usd", 2)} · {pct(flow.byChain[c.key])}
                  </span>
                ) : null
              }
            />
          </span>
        ))}
      </div>
      {!ready ? (
        <StatsStatus state={dataState} className="min-h-[320px]" />
      ) : table ? (
        <div className={SCROLL_TABLE}>
          <Table>
            <thead className="sticky top-0 z-[1] bg-slate-900">
              <TableTheadTr>
                <TableTh>
                  <Trans>From</Trans>
                </TableTh>
                <TableTh>
                  <Trans>To</Trans>
                </TableTh>
                <TableTh className="!text-right">
                  <Trans>Amount</Trans>
                </TableTh>
                {FLOW_CHAINS.map((c) => (
                  <TableTh key={c.key} className="!text-right">
                    {c.label}
                  </TableTh>
                ))}
                <TableTh className="!text-right">
                  <Trans>Share</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {flow.rows.map((r, i) => (
                <TableTr key={i}>
                  <TableTd className="whitespace-nowrap">{r.from}</TableTd>
                  <TableTd className="whitespace-nowrap">{r.to}</TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">{fmtFull(r.v, "usd")}</TableTd>
                  {FLOW_CHAINS.map((c) => (
                    <TableTd key={c.key} className="whitespace-nowrap text-right numbers">
                      {r.by[c.key] !== undefined ? fmtFull(r.by[c.key]!, "usd") : "–"}
                    </TableTd>
                  ))}
                  <TableTd className="text-right numbers">{pct(r.v)}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : total > 0 ? (
        <div className="-mx-16 overflow-x-auto px-16 md:mx-0 md:px-0">
          <div className="min-w-[760px]">
            <ResponsiveContainer width="100%" height={540}>
              <Sankey
                data={sankeyData}
                nodeWidth={12}
                nodePadding={32}
                iterations={32}
                sort={false}
                margin={SANKEY_MARGIN}
                node={((p: never) => FlowNode(p, total, false)) as never}
                link={((p: never) => FlowLink(p)) as never}
              >
                <Tooltip
                  isAnimationActive={false}
                  wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d: SankeyDatum = (payload[0].payload as { payload?: SankeyDatum })?.payload ?? {};
                    const link = d.source && d.target ? { source: d.source, target: d.target } : null;
                    const name = link ? link.source.name + " → " + link.target.name : d.name || String(payload[0].name);
                    const val = d.value ?? Number(payload[0].value);
                    const node = link ? (link.target.side === "out" ? link.target : null) : d;
                    const by = node?.by && Object.keys(node.by).length > 1 ? node.by : null;
                    return (
                      <ChartTip head={name}>
                        <ChartTipRow label={t`Amount`} value={fmtFull(val, "usd")} />
                        {by
                          ? FLOW_CHAINS.filter((c) => by[c.key] !== undefined).map((c) => {
                              const chainName = c.label;
                              return (
                                <ChartTipRow
                                  key={c.key}
                                  label={t`From ${chainName}`}
                                  color={c.color}
                                  value={fmtFull(by[c.key]!, "usd")}
                                />
                              );
                            })
                          : null}
                        <ChartTipRow
                          total
                          label={t`Share of total fees`}
                          value={total ? ((val / total) * 100).toFixed(1) + "%" : "–"}
                        />
                      </ChartTip>
                    );
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-body-medium py-12 text-typography-secondary">
          <Trans>No fees in this period.</Trans>
        </div>
      )}
    </Card>
  );
}
