import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expandDecimals } from "lib/numbers";

import { TPSLInputRow } from "./TPSLInputRow";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

const positionData = {
  sizeInTokens: expandDecimals(1, 18),
  collateralUsd: expandDecimals(10, 30),
  entryPrice: expandDecimals(100, 30),
  referencePrice: expandDecimals(100, 30),
  isLong: true,
  indexTokenDecimals: 18,
};

describe("TPSLInputRow", () => {
  it("keeps long derived percentages unchanged and contained within the PnL row", () => {
    const view = render(
      <I18nProvider i18n={i18n}>
        <TPSLInputRow
          type="takeProfit"
          priceValue="100000000000000000000"
          onPriceChange={vi.fn()}
          positionData={positionData}
        />
      </I18nProvider>
    );

    const inputs = view.getAllByRole("textbox") as HTMLInputElement[];

    expect(inputs[0].value).toBe("100000000000000000000");
    expect(inputs[1].value).toMatch(/^\d+(?:\.\d+)?$/);
    expect(inputs[1].value.length).toBeGreaterThan(6);
    expect(inputs[1].value).not.toBe("199.99");

    const estimatedPnlValue = view.getByText("Est. PnL").nextElementSibling;
    expect(estimatedPnlValue?.classList.contains("truncate")).toBe(true);
  });

  it("keeps prices calculated from long percentage inputs in plain decimal notation", () => {
    const onPriceChange = vi.fn();
    const view = render(
      <I18nProvider i18n={i18n}>
        <TPSLInputRow type="takeProfit" priceValue="100" onPriceChange={onPriceChange} positionData={positionData} />
      </I18nProvider>
    );

    const inputs = view.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.change(inputs[1], { target: { value: "9659861417460889000000" } });

    const calculatedPrice = onPriceChange.mock.calls[onPriceChange.mock.calls.length - 1][0];
    expect(calculatedPrice).toMatch(/^\d+(?:\.\d+)?$/);
    expect(calculatedPrice).not.toMatch(/[eE]/);
  });
});
