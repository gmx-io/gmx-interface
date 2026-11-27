import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { BREAK_PART, expandDecimals, formatTokenAmountWithUsdParts, numberParts } from "lib/numbers";

import { NumericValue } from "./NumericValue";

afterEach(cleanup);

describe("NumericValue with a break part", () => {
  it("keeps each part whole and lets the value wrap between them, even inside a nowrap cell", () => {
    const parts = formatTokenAmountWithUsdParts(
      expandDecimals(1_000_000_000, 6),
      expandDecimals(1_000_000_000, USD_DECIMALS),
      "USDC",
      6
    );
    const { container } = render(<NumericValue parts={parts} className="numbers" />);

    const root = container.firstElementChild!;
    expect(root.className).toBe("numbers !whitespace-normal");

    const groups = Array.from(root.children);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.className === "whitespace-nowrap")).toBe(true);
    expect(groups[0].textContent).toMatch(/USDC$/);
    expect(groups[1].textContent).toMatch(/^\(.*\)$/);
    expect(root.textContent).toBe(`${groups[0].textContent} ${groups[1].textContent}`);
  });

  it("drops a break at the start or end instead of showing a stray space", () => {
    const { container } = render(<NumericValue parts={numberParts(BREAK_PART, "1.00", BREAK_PART)} />);

    expect(container.textContent).toBe("1.00");
  });
});
