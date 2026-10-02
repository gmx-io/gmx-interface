import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { formatLeverage } from "domain/synthetics/positions";
import { expandDecimals, formatAmountHuman, formatDeltaUsd, formatUsd, formatUsdParts, numberParts } from "lib/numbers";

import { AmountHumanValue } from "./AmountHumanValue";
import { DeltaUsdValue } from "./DeltaUsdValue";
import { LeverageValue } from "./LeverageValue";
import { LiquidationPriceValue } from "./LiquidationPriceValue";
import { HAIR_SPACE, NumericText, NumericValue } from "./NumericValue";
import { UsdPriceValue } from "./UsdPriceValue";
import { UsdValue } from "./UsdValue";

afterEach(cleanup);

const usd = (amount: number) => expandDecimals(amount, USD_DECIMALS);

function affixes(root: Element) {
  return Array.from(root.querySelectorAll("span.numeric-affix")).map((span) => span.textContent);
}

describe("NumericValue", () => {
  it("renders parts in one non-wrapping span with affixes in secondary spans", () => {
    const { container } = render(<NumericValue parts={formatUsdParts(usd(52))} className="numbers" />);

    const root = container.firstElementChild!;
    expect(root.tagName).toBe("SPAN");
    expect(root.className).toBe("whitespace-nowrap numbers");
    expect(root.textContent).toBe(`$${HAIR_SPACE}52.00`);
    expect(affixes(root)).toEqual([`$${HAIR_SPACE}`]);
    expect(root.childNodes).toHaveLength(2);
  });

  it("renders nothing without parts unless a fallback is given", () => {
    expect(render(<NumericValue parts={undefined} />).container.innerHTML).toBe("");

    const { container } = render(<NumericValue parts={undefined} fallback="..." className="numbers" />);
    expect(container.firstElementChild!.textContent).toBe("...");
    expect(container.firstElementChild!.className).toBe("whitespace-nowrap numbers");
  });

  it("applies a custom affix class", () => {
    const { container } = render(<NumericValue parts={formatUsdParts(usd(1))} affixClassName="text-blue-300" />);

    expect(container.querySelector("span > span")!.className).toBe("text-blue-300");
  });
});

describe("typed values", () => {
  it("UsdValue renders formatUsd with the same text and a secondary $", () => {
    const { container } = render(<UsdValue usd={-usd(1234)} displayDecimals={0} />);

    const root = container.firstElementChild!;
    expect(root.textContent).toBe(formatUsd(-usd(1234), { displayDecimals: 0 }));
    expect(root.textContent).toBe(`-$${HAIR_SPACE}1,234`);
    expect(affixes(root)).toEqual([`$${HAIR_SPACE}`]);
  });

  it("UsdValue keeps threshold markers as regular text", () => {
    const { container } = render(<UsdValue usd={usd(2_000_000_000)} />);

    const root = container.firstElementChild!;
    expect(root.textContent).toBe(`>\u00a0$${HAIR_SPACE}1,000,000,000.00`);
    expect(affixes(root)).toEqual([`$${HAIR_SPACE}`]);
  });

  it("DeltaUsdValue keeps the sign and the percentage outside the affix", () => {
    const percentage = expandDecimals(2, 2);
    const { container } = render(<DeltaUsdValue deltaUsd={usd(1)} percentage={percentage} />);

    const root = container.firstElementChild!;
    expect(root.textContent).toBe(formatDeltaUsd(usd(1), percentage));
    expect(root.textContent).toBe(`+$${HAIR_SPACE}1.00 (+2.00%)`);
    expect(affixes(root)).toEqual([`$${HAIR_SPACE}`]);
  });

  it("LeverageValue adds exactly one hair space before a secondary x", () => {
    const leverage = expandDecimals(207, 2);
    const { container } = render(<LeverageValue leverage={leverage} />);

    const root = container.firstElementChild!;
    expect(formatLeverage(leverage)).toBe("2.07x");
    expect(root.textContent).toBe(`2.07${HAIR_SPACE}x`);
    expect(affixes(root)).toEqual([`${HAIR_SPACE}x`]);
  });

  it("AmountHumanValue keeps the magnitude suffix as plain text", () => {
    const { container } = render(<AmountHumanValue amount={usd(1_150_000_000)} decimals={USD_DECIMALS} showDollar />);

    const root = container.firstElementChild!;
    expect(root.textContent).toBe(formatAmountHuman(usd(1_150_000_000), USD_DECIMALS, true));
    expect(root.textContent).toBe(`$${HAIR_SPACE}1.1b`);
    expect(affixes(root)).toEqual([`$${HAIR_SPACE}`]);

    const plain = render(<AmountHumanValue amount={expandDecimals(12_500, 18)} decimals={18} />).container
      .firstElementChild!;
    expect(plain.textContent).toBe("12.5k");
    expect(affixes(plain)).toEqual([]);
    expect(plain.childNodes).toHaveLength(1);
  });

  it("UsdPriceValue and LiquidationPriceValue keep the formatter placeholders", () => {
    expect(render(<UsdPriceValue price={-1n} />).container.textContent).toBe("NA");
    expect(render(<UsdPriceValue price={undefined} fallback="-" />).container.textContent).toBe("-");
    expect(render(<LiquidationPriceValue liquidationPrice={undefined} />).container.textContent).toBe("NA");

    const { container } = render(<LiquidationPriceValue liquidationPrice={usd(2_000_000)} />);
    expect(container.textContent).toBe(`>\u00a0$${HAIR_SPACE}1,000,000.00`);
  });

  it("NumericText renders parts as a value and strings as plain text", () => {
    const parts = numberParts("> ", formatUsdParts(usd(1)));
    const { container } = render(<NumericText text={parts} className="numbers" />);

    expect(container.firstElementChild!.textContent).toBe(`> $${HAIR_SPACE}1.00`);
    expect(affixes(container.firstElementChild!)).toEqual([`$${HAIR_SPACE}`]);

    const text = render(<NumericText text="1.0000 ETH" className="numbers" />).container.firstElementChild!;
    expect(text.innerHTML).toBe("1.0000 ETH");
    expect(text.className).toBe("numbers");
  });
});
