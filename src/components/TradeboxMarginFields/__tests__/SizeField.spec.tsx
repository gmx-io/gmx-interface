import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";

import { SizeField } from "../SizeField";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

const pepeToken = {
  symbol: "PEPE",
  decimals: 18,
  visualMultiplier: 1000,
  visualPrefix: "k",
} as TokenData;

describe("SizeField", () => {
  it("shows the visual multiplier prefix in the alternate token amount", () => {
    render(
      <I18nProvider i18n={i18n}>
        <SizeField
          sizeInTokens={expandDecimals(1000, 18)}
          sizeInUsd={expandDecimals(4, 30)}
          indexToken={pepeToken}
          displayMode="usd"
          onDisplayModeChange={vi.fn()}
          inputValue="4"
          onInputValueChange={vi.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByText(/≈1\.0000\s*kPEPE/)).toBeTruthy();
  });
});
