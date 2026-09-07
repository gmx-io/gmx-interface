import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ComponentProps } from "react";
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

const shortPositionData = { ...positionData, isLong: false };

function renderRow(props: Partial<ComponentProps<typeof TPSLInputRow>> = {}) {
  const view = render(
    <I18nProvider i18n={i18n}>
      <TPSLInputRow
        type="takeProfit"
        priceValue=""
        onPriceChange={vi.fn()}
        positionData={positionData}
        variant="full"
        {...props}
      />
    </I18nProvider>
  );

  const inputs = view.getAllByRole("textbox") as HTMLInputElement[];

  return {
    view,
    priceInput: inputs[0],
    gainLossInput: inputs[1],
    estimatedPnlText: view.getByText("Est. PnL").nextElementSibling?.textContent ?? "",
  };
}

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

describe("TPSLInputRow with a blocking price direction error", () => {
  const invalidDirectionCases = [
    {
      name: "a long TP price below the mark price",
      type: "takeProfit",
      positionData,
      priceValue: "90",
      priceError: "Set TP price above mark price",
    },
    {
      name: "a short TP price above the mark price",
      type: "takeProfit",
      positionData: shortPositionData,
      priceValue: "110",
      priceError: "Set TP price below mark price",
    },
    {
      name: "a long SL price above the mark price",
      type: "stopLoss",
      positionData,
      priceValue: "110",
      priceError: "Set SL price below mark price",
    },
    {
      name: "a short SL price below the mark price",
      type: "stopLoss",
      positionData: shortPositionData,
      priceValue: "90",
      priceError: "Set SL price above mark price",
    },
  ] as const;

  it.each(invalidDirectionCases)("hides the derived gain/loss and estimated PnL for $name", (testCase) => {
    const { priceInput, gainLossInput, estimatedPnlText } = renderRow({
      type: testCase.type,
      positionData: testCase.positionData,
      priceValue: testCase.priceValue,
      priceError: testCase.priceError,
    });

    expect(priceInput.className).toContain("text-red-500");
    expect(gainLossInput.value).toBe("");
    expect(gainLossInput.placeholder).toBe("-");
    expect(estimatedPnlText).toBe("-");
  });

  it("hides the derived values in the compact variant as well", () => {
    const { gainLossInput, estimatedPnlText } = renderRow({
      variant: "compact",
      priceValue: "90",
      priceError: "Set TP price above mark price",
    });

    expect(gainLossInput.value).toBe("");
    expect(gainLossInput.placeholder).toBe("Gain");
    expect(estimatedPnlText).toBe("-");
  });

  it("still derives a trigger price from a gain entered by the user", () => {
    const onPriceChange = vi.fn();
    const { view, gainLossInput } = renderRow({
      priceValue: "90",
      priceError: "Set TP price above mark price",
      onPriceChange,
    });

    fireEvent.change(gainLossInput, { target: { value: "50" } });

    expect(onPriceChange).toHaveBeenCalledWith("105");
    expect((view.getAllByRole("textbox")[1] as HTMLInputElement).value).toBe("50");
  });

  it("keeps the derived gain and estimated PnL for a valid take profit price", () => {
    const { gainLossInput, estimatedPnlText } = renderRow({ priceValue: "110" });

    expect(gainLossInput.value).toBe("100");
    expect(gainLossInput.placeholder).toBe("0");
    expect(estimatedPnlText).toContain("+");
    expect(estimatedPnlText).toContain("100.00%");
  });

  it("keeps the capped loss and estimated PnL for a beyond-liquidation warning", () => {
    const { gainLossInput, estimatedPnlText } = renderRow({
      type: "stopLoss",
      positionData: { ...positionData, liquidationPrice: expandDecimals(92, 30) },
      priceValue: "90",
      priceWarning: "This trigger price is beyond the current liquidation price.",
    });

    expect(gainLossInput.value).toBe("100");
    expect(gainLossInput.placeholder).toBe("0");
    expect(estimatedPnlText).toContain("-100.00%");
  });
});
