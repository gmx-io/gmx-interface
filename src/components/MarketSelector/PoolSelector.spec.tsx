import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { EMPTY_ARRAY } from "lib/objects";

import { PoolSelector } from "./PoolSelector";

vi.mock("components/Modal/SlideModal", () => ({ SlideModal: () => null }));
vi.mock("./PoolListItem", () => ({ PoolListItem: () => null }));

afterEach(cleanup);

const market = createMockMarketInfo();
const loadedMarkets = [market];

describe("PoolSelector loading", () => {
  it("shows a placeholder before receive pools load", () => {
    const { getByText } = render(
      <PoolSelector
        chainId={42161}
        markets={EMPTY_ARRAY}
        onSelectMarket={vi.fn()}
        favoriteKey="gm-token-selector"
        showAllPools
        showIndexIcon
      />
    );

    expect(getByText("...")).toBeTruthy();
  });

  it("keeps a visible label when pools temporarily disappear and restores the selection when they return", () => {
    const onSelectMarket = vi.fn();
    const props = {
      chainId: 42161,
      selectedMarketAddress: market.marketTokenAddress,
      onSelectMarket,
      favoriteKey: "gm-token-selector" as const,
      showAllPools: true,
      showIndexIcon: true,
    };
    const { getByText, getByAltText, rerender } = render(<PoolSelector {...props} markets={loadedMarkets} />);

    expect(getByText("GM: ETH/USD")).toBeTruthy();
    expect(getByAltText("ETH")).toBeTruthy();

    rerender(<PoolSelector {...props} markets={EMPTY_ARRAY} />);
    expect(getByText("...")).toBeTruthy();

    rerender(<PoolSelector {...props} markets={loadedMarkets} />);
    expect(getByText("GM: ETH/USD")).toBeTruthy();
    expect(getByAltText("ETH")).toBeTruthy();
    expect(onSelectMarket).not.toHaveBeenCalled();
  });
});
