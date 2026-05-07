import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, beforeAll } from "vitest";

import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";

import { SubCategoryTabs } from "../SubCategoryTabs";

beforeAll(() => {
  // Activate the source locale; tests don't need real translations.
  i18n.load("en", {});
  i18n.activate("en");
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <TokensFavoritesContextProvider>{ui}</TokensFavoritesContextProvider>
    </I18nProvider>
  );
}

describe("SubCategoryTabs", () => {
  afterEach(cleanup);

  it("hides empty sub-cats but always shows 'all'", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="tradfi"
        populatedSubCategories={new Set(["commodities"])}
      />
    );
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toContain("All");
    expect(labels).toContain("Commodities");
    expect(labels).not.toContain("Stocks");
    expect(labels).not.toContain("Indices");
    expect(labels).not.toContain("FX");
  });

  it("renders all crypto sub-cats when populated, in spec order", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="crypto"
        populatedSubCategories={new Set(["ai", "layer1", "layer2", "defi", "meme"])}
      />
    );
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["All", "AI", "DeFi", "Meme", "Layer 1", "Layer 2"]);
  });

  it("places AI right after All for crypto", () => {
    renderWithProviders(
      <SubCategoryTabs
        favoritesKey="chart-token-selector"
        parent="crypto"
        populatedSubCategories={new Set(["ai", "layer1"])}
      />
    );
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels[0]).toBe("All");
    expect(labels[1]).toBe("AI");
  });
});
