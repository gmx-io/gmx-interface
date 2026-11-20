import { i18n } from "@lingui/core";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { latestStateRef, StateCtx } from "context/SyntheticsStateContext/utils";
import { getDefaultEntryField } from "domain/synthetics/sidecarOrders/utils";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { BTC_ADDRESS, ETH_ADDRESS, ETH_TOKEN, NATIVE_ETH_ADDRESS, NATIVE_ETH_TOKEN } from "domain/testUtils/mockTokens";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { getChartOrderPriceInputValue, useChartContextMenu } from "../useChartContextMenu";

vi.mock("context/SettingsContext/SettingsContextProvider", async (original) => ({
  ...(await original<typeof import("context/SettingsContext/SettingsContextProvider")>()),
  useSettings: () => ({}),
}));
vi.mock("lib/chains", async (original) => ({
  ...(await original<typeof import("lib/chains")>()),
  useChainId: () => ({ networkId: 42161 }),
}));

describe("chart order prices", () => {
  it("preserves the selected token price when prefilling an order SEC-48", () => {
    for (const [price, chartMultiplier, fieldMultiplier, expected] of [
      [1.5, 1, 1, 15n * 10n ** 29n],
      [1500, 1000, 1000, 15n * 10n ** 29n],
      [1500, 1000, 1, 15n * 10n ** 29n],
      [1e-8, 1, 1000, 10n ** 22n],
    ] as const) {
      const input = getChartOrderPriceInputValue(price, chartMultiplier, fieldMultiplier);
      expect(getDefaultEntryField(30, { input }, fieldMultiplier).value).toBe(expected);
    }
  });
  it("opens the perp for the asset on the swap chart", async () => {
    i18n.load("en", {});
    i18n.activate("en");
    const market = createMockMarketInfo();
    const state = createMockSyntheticsState({
      tradeType: TradeType.Swap,
      toTokenAddress: NATIVE_ETH_ADDRESS,
      tokensData: { [NATIVE_ETH_ADDRESS]: NATIVE_ETH_TOKEN, [ETH_ADDRESS]: ETH_TOKEN },
    });
    state.tradebox.availableTokensOptions.sortedAllMarkets = [market];
    let perpTokenAddress = BTC_ADDRESS;
    state.tradebox.setTradeConfig = (config) => {
      perpTokenAddress = config.toTokenAddress ?? perpTokenAddress;
      latestStateRef.current = {
        ...state,
        tradebox: {
          ...state.tradebox,
          tradeType: config.tradeType ?? state.tradebox.tradeType,
          tradeMode: config.tradeMode ?? state.tradebox.tradeMode,
          toTokenAddress: perpTokenAddress,
        },
      };
    };
    let input = "";
    state.tradebox.setTriggerPriceInputValue = (value) => {
      input = typeof value === "function" ? value(input) : value;
    };
    latestStateRef.current = state;
    function OrderMenu() {
      const { getContextMenuItems } = useChartContextMenu(1, { current: null }, false);
      const [item] = getContextMenuItems(1500);
      return <button onClick={item.click}>{item.text}</button>;
    }
    const view = render(
      <StateCtx.Provider value={state}>
        <OrderMenu />
      </StateCtx.Provider>
    );
    try {
      await act(async () => {
        view.getByRole("button").click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(perpTokenAddress).toBe(ETH_ADDRESS);
      expect(latestStateRef.current?.tradebox.tradeMode).toBe(TradeMode.Limit);
      expect(input).toBe("1500");
    } finally {
      view.unmount();
      latestStateRef.current = null;
    }
  });
});
