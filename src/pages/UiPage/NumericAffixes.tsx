import cx from "classnames";
import { ReactNode, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals, formatTokenAmountWithUsdParts } from "lib/numbers";

import { AmountHumanValue } from "components/NumericValue/AmountHumanValue";
import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import { LeverageValue } from "components/NumericValue/LeverageValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";

type Context = {
  id: string;
  title: string;
  className?: string;
  rows: { label: string; value: ReactNode }[];
};

type Surface = "tooltip" | "card" | "page";

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
      { label: "Network fee", value: <NumericValue parts={NETWORK_FEE_PARTS} /> },
      { label: "Liq. price", value: <UsdValue usd={usd(199_900)} /> },
      { label: "Leverage", value: <LeverageValue leverage={LEVERAGE} /> },
      { label: "Volume", value: <AmountHumanValue amount={usd(120_000_000_000)} decimals={USD_DECIMALS} showDollar /> },
    ],
  },
  {
    id: "positive",
    title: "Positive (green-strong)",
    className: "text-green-strong",
    rows: [
      { label: "Refund", value: <NumericValue parts={FEE_REFUND_PARTS} /> },
      { label: "PnL", value: <DeltaUsdValue deltaUsd={usd(123_456)} percentage={PNL_PERCENTAGE} /> },
    ],
  },
  {
    id: "negative",
    title: "Negative (red-strong)",
    className: "text-red-strong",
    rows: [
      { label: "PnL", value: <DeltaUsdValue deltaUsd={-usd(123_456)} percentage={-PNL_PERCENTAGE} /> },
      { label: "Fees", value: <UsdValue usd={-usd(49)} /> },
    ],
  },
  {
    id: "warning",
    title: "Incomplete (yellow-strong)",
    className: "text-yellow-strong",
    rows: [
      {
        label: "Open interest",
        value: <AmountHumanValue amount={usd(120_000_000_000)} decimals={USD_DECIMALS} showDollar />,
      },
    ],
  },
  {
    id: "accent",
    title: "Hover / active (blue-strong)",
    className: "text-blue-strong",
    rows: [{ label: "Leverage", value: <LeverageValue leverage={LEVERAGE} /> }],
  },
  {
    id: "muted",
    title: "Muted (textIcon-secondary)",
    className: "text-textIcon-secondary",
    rows: [
      { label: "Rewards", value: <UsdValue usd={0n} /> },
      {
        label: "Balance",
        value: (
          <>
            <AmountHumanValue amount={expandDecimals(12_500, 18)} decimals={18} /> GM
          </>
        ),
      },
    ],
  },
];

const SURFACES: { id: Surface; title: string; className: string }[] = [
  { id: "tooltip", title: "Tooltip", className: "Tooltip-popup" },
  { id: "card", title: "Card", className: "rounded-8 bg-fill-surfaceBase p-10 text-body-medium" },
  { id: "page", title: "Page", className: "p-10 text-body-medium" },
];

export function NumericAffixes() {
  const [surface, setSurface] = useState<Surface>("tooltip");

  const surfaceClassName = SURFACES.find((item) => item.id === surface)!.className;

  return (
    <div className="px-20">
      <h2 className="text-h4 mb-16 mt-24">Numeric affixes</h2>
      <p className="max-w-prose">
        The $ prefix and the leverage x are separated from the number by a hair space. Inside primary text they are
        drawn in the secondary colour; inside a coloured value they keep the colour of the number. The k / m / b
        suffixes are plain text. Switch the surface and the theme to check every context.
      </p>

      <div className="mb-16 mt-12 flex gap-8">
        {SURFACES.map((item) => (
          <button
            key={item.id}
            className={cx("rounded-4 px-8 py-4", item.id === surface ? "bg-fill-accent" : "bg-fill-surfaceElevated")}
            onClick={() => setSurface(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-8">
        {CONTEXTS.map((context) => (
          <div key={context.id} className={cx("!w-[260px] shrink-0", surfaceClassName)}>
            <div className="text-body-small mb-4 text-textIcon-secondary">{context.title}</div>
            {context.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-12">
                <span className="whitespace-nowrap text-textIcon-secondary">{row.label}</span>
                <span className={cx("numbers", context.className)}>{row.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
