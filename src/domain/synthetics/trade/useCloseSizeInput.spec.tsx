import { act, cleanup, render } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatAmountFree, parseValue } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { useCloseSizeInput } from "./useCloseSizeInput";

const settings = vi.hoisted(() => ({ showCloseSizeInTokens: false }));

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({
    showCloseSizeInTokens: settings.showCloseSizeInTokens,
    setShowCloseSizeInTokens: (value: boolean) => {
      settings.showCloseSizeInTokens = value;
    },
  }),
}));

const POSITION_SIZE_USD = 20_580_351_234_567_890_000_000_000_000_000_000n;
const POSITION_SIZE_IN_TOKENS = 10_010_123_456_789_012_345n;
const ORDER_SIZE_USD = 10_084_371_234_567_890_000_000_000_000_000_000n;

type Step = "open" | "toggle" | "otherFormToggle" | "type" | "slider" | "positionCloses";

let closeSize: ReturnType<typeof useCloseSizeInput>;
let hasPosition = true;

function Harness() {
  closeSize = useCloseSizeInput({
    positionSizeInUsd: hasPosition ? POSITION_SIZE_USD : undefined,
    positionSizeInTokens: hasPosition ? POSITION_SIZE_IN_TOKENS : undefined,
    indexTokenDecimals: 18,
    indexTokenSymbol: "ETH",
  });
  return null;
}

function run(showInTokens: boolean, steps: Step[]) {
  settings.showCloseSizeInTokens = showInTokens;
  const { rerender } = render(<Harness />);

  for (const step of steps) {
    act(() => {
      if (step === "open") closeSize.setFromUsd(ORDER_SIZE_USD);
      if (step === "toggle") closeSize.handleSizeToggle();
      if (step === "otherFormToggle") settings.showCloseSizeInTokens = !settings.showCloseSizeInTokens;
      if (step === "type") {
        closeSize.handleInputChange({ target: { value: closeSize.closeSizeInput } } as ChangeEvent<HTMLInputElement>);
      }
      if (step === "slider") closeSize.handleSliderChange(50);
      if (step === "positionCloses") hasPosition = false;
    });
    rerender(<Harness />);
  }

  return closeSize;
}

describe("useCloseSizeInput", () => {
  afterEach(() => {
    cleanup();
    hasPosition = true;
  });

  it.each<[string, boolean, Step[]]>([
    ["tokens", true, ["open"]],
    ["USD", false, ["open"]],
    ["tokens, switched to USD", true, ["open", "toggle"]],
    ["USD, switched to tokens", false, ["open", "toggle"]],
    ["tokens, switched in another form", true, ["open", "otherFormToggle"]],
  ])("keeps the order's exact close size until the amount is edited: %s", (_, showInTokens, steps) => {
    expect(run(showInTokens, steps).closeSizeUsd).toBe(ORDER_SIZE_USD);
  });

  it.each<[Step, (openedInput: string) => bigint]>([
    ["type", (openedInput) => bigMath.mulDiv(parseValue(openedInput, 18)!, POSITION_SIZE_USD, POSITION_SIZE_IN_TOKENS)],
    ["slider", () => POSITION_SIZE_USD / 2n],
  ])("uses the edited amount after %s in tokens", (edit, getExpected) => {
    const openedInput = run(true, ["open"]).closeSizeInput;
    const closeSizeUsd = run(true, ["open", edit]).closeSizeUsd;

    expect(closeSizeUsd).toBe(getExpected(openedInput));
    expect(closeSizeUsd).not.toBe(ORDER_SIZE_USD);
  });

  it("shows and reads the close size in USD while there is no position to convert it to tokens", () => {
    hasPosition = false;
    const { closeSizeInput, closeSizeLabel, closeSizeUsd } = run(true, ["open", "toggle"]);

    expect([closeSizeInput, closeSizeLabel, closeSizeUsd]).toEqual([
      formatAmountFree(ORDER_SIZE_USD, 30),
      "USD",
      ORDER_SIZE_USD,
    ]);
    expect(settings.showCloseSizeInTokens).toBe(true);
    expect(run(true, ["open", "type"]).closeSizeUsd).toBe(parseValue(closeSizeInput, 30));
  });

  it("drops an amount typed in tokens when the position closes", () => {
    const { closeSizeInput, closeSizeUsd } = run(true, ["open", "type", "positionCloses"]);

    expect([closeSizeInput, closeSizeUsd]).toEqual(["", 0n]);
  });
});
