import cx from "classnames";
import { ChangeEvent, CSSProperties, ReactNode, useCallback, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals, formatTokenAmountWithUsdParts } from "lib/numbers";

import { AmountHumanValue } from "components/NumericValue/AmountHumanValue";
import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import { LeverageValue } from "components/NumericValue/LeverageValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";

import "./NumericAffixes.css";

type Variant = {
  id: string;
  title: string;
  rule: string;
  affixClassName: string;
  defaultStrength?: number;
};

type Context = {
  id: string;
  title: string;
  className?: string;
  rows: { label: string; render: (affixClassName: string) => ReactNode }[];
};

type Surface = "tooltip" | "card" | "page";

const VARIANTS: Variant[] = [
  {
    id: "token",
    title: "Secondary token",
    rule: "color: typography.secondary",
    affixClassName: "text-typography-secondary",
  },
  {
    id: "mix-secondary",
    title: "Mix with secondary",
    rule: "color-mix(in oklab, typography.secondary S%, currentColor)",
    affixClassName: "NumericAffixes-mix-secondary",
    defaultStrength: 70,
  },
  {
    id: "mix-background",
    title: "Mix with page background",
    rule: "color-mix(in oklab, currentColor S%, page background)",
    affixClassName: "NumericAffixes-mix-background",
    defaultStrength: 60,
  },
  {
    id: "relative-oklch",
    title: "Relative OKLCH",
    rule: "oklch(from currentColor S% min(c, 0.08) h)",
    affixClassName: "NumericAffixes-relative-oklch",
    defaultStrength: 72,
  },
  {
    id: "filter-contrast",
    title: "Contrast filter",
    rule: "filter: contrast(S%)",
    affixClassName: "NumericAffixes-filter-contrast",
    defaultStrength: 40,
  },
];

const usd = (cents: number) => expandDecimals(cents, USD_DECIMALS - 2);

const LEVERAGE = expandDecimals(207, 2);
const PNL_PERCENTAGE = 215n;
const NETWORK_FEE_PARTS = formatTokenAmountWithUsdParts(-710_000n, usd(71), "USDC", 6, {
  displayDecimals: 2,
  isStable: true,
});
const FEE_REFUND_PARTS = formatTokenAmountWithUsdParts(100_000_000_000_000n, usd(22), "WETH", 18, {
  displayPlus: true,
  displayDecimals: 4,
});

const CONTEXTS: Context[] = [
  {
    id: "primary",
    title: "Primary text",
    rows: [
      { label: "Network fee", render: (a) => <NumericValue parts={NETWORK_FEE_PARTS} affixClassName={a} /> },
      { label: "Liq. price", render: (a) => <UsdValue usd={usd(199_900)} affixClassName={a} /> },
      { label: "Leverage", render: (a) => <LeverageValue leverage={LEVERAGE} affixClassName={a} /> },
      {
        label: "Volume",
        render: (a) => (
          <AmountHumanValue amount={usd(120_000_000_000)} decimals={USD_DECIMALS} showDollar affixClassName={a} />
        ),
      },
    ],
  },
  {
    id: "positive",
    title: "Positive (green-500)",
    className: "text-green-500",
    rows: [
      { label: "Refund", render: (a) => <NumericValue parts={FEE_REFUND_PARTS} affixClassName={a} /> },
      {
        label: "PnL",
        render: (a) => <DeltaUsdValue deltaUsd={usd(123_456)} percentage={PNL_PERCENTAGE} affixClassName={a} />,
      },
    ],
  },
  {
    id: "negative",
    title: "Negative (red-500)",
    className: "text-red-500",
    rows: [
      {
        label: "PnL",
        render: (a) => <DeltaUsdValue deltaUsd={-usd(123_456)} percentage={-PNL_PERCENTAGE} affixClassName={a} />,
      },
      { label: "Fees", render: (a) => <UsdValue usd={-usd(49)} affixClassName={a} /> },
    ],
  },
  {
    id: "warning",
    title: "Incomplete (yellow-300)",
    className: "text-yellow-300",
    rows: [
      {
        label: "Open interest",
        render: (a) => (
          <AmountHumanValue amount={usd(120_000_000_000)} decimals={USD_DECIMALS} showDollar affixClassName={a} />
        ),
      },
    ],
  },
  {
    id: "accent",
    title: "Hover / active (blue-300)",
    className: "text-blue-300",
    rows: [{ label: "Leverage", render: (a) => <LeverageValue leverage={LEVERAGE} affixClassName={a} /> }],
  },
  {
    id: "muted",
    title: "Muted (typography-secondary)",
    className: "text-typography-secondary",
    rows: [
      { label: "Rewards", render: (a) => <UsdValue usd={0n} affixClassName={a} /> },
      {
        label: "Balance",
        render: (a) => (
          <>
            <AmountHumanValue amount={expandDecimals(12_500, 18)} decimals={18} affixClassName={a} /> GM
          </>
        ),
      },
    ],
  },
];

const SURFACES: { id: Surface; title: string; className: string }[] = [
  { id: "tooltip", title: "Tooltip", className: "Tooltip-popup" },
  { id: "card", title: "Card", className: "rounded-8 bg-slate-900 p-10 text-body-medium" },
  { id: "page", title: "Page", className: "p-10 text-body-medium" },
];

export function NumericAffixes() {
  const [surface, setSurface] = useState<Surface>("tooltip");
  const [strengths, setStrengths] = useState(() => VARIANTS.map((variant) => variant.defaultStrength ?? 0));

  const columnStyles = useMemo(
    () => strengths.map((strength) => ({ "--affix-strength": strength }) as CSSProperties),
    [strengths]
  );

  const handleStrengthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const index = Number(event.target.dataset.index);
    const value = Number(event.target.value);

    setStrengths((previous) => previous.map((strength, i) => (i === index ? value : strength)));
  }, []);

  const surfaceClassName = SURFACES.find((item) => item.id === surface)!.className;

  return (
    <div className="px-20">
      <h2 className="mb-16 mt-24 text-24 font-medium">Numeric affixes</h2>
      <p className="max-w-prose">
        The $ prefix, the leverage x and the k / m / b suffixes are rendered in the secondary text colour. The first
        column is that fixed colour; the others derive the affix colour from the colour of the value itself, so an affix
        inside a green, red or yellow value keeps its hue. The derived rules mix with a fixed reference (a theme token
        or the page background) instead of using opacity, so the surface behind the value does not change the result.
        Switch the surface and the theme to check, and drag the sliders to tune each rule.
      </p>

      <div className="mb-16 mt-12 flex gap-8">
        {SURFACES.map((item) => (
          <button
            key={item.id}
            className={cx("rounded-4 px-8 py-4", item.id === surface ? "bg-slate-600" : "bg-slate-800")}
            onClick={() => setSurface(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="overflow-auto">
        <div className="flex gap-8">
          {VARIANTS.map((variant, index) => (
            <div key={variant.id} className="w-[228px] shrink-0">
              <div className="font-medium">{variant.title}</div>
              <div className="text-12 text-typography-secondary">{variant.rule}</div>
              {variant.defaultStrength !== undefined && (
                <label className="flex items-center gap-8 text-12 text-typography-secondary">
                  S = {strengths[index]}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={strengths[index]}
                    data-index={index}
                    onChange={handleStrengthChange}
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        {CONTEXTS.map((context) => (
          <div key={context.id}>
            <div className="mb-4 mt-12 text-12 text-typography-secondary">{context.title}</div>
            <div className="flex items-stretch gap-8">
              {VARIANTS.map((variant, index) => (
                <div
                  key={variant.id}
                  className={cx("!w-[228px] shrink-0", surfaceClassName)}
                  style={columnStyles[index]}
                >
                  {context.rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-12">
                      <span className="whitespace-nowrap text-typography-secondary">{row.label}</span>
                      <span className={cx("numbers", context.className)}>{row.render(variant.affixClassName)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
