import { i18n } from "@lingui/core";
import { act, fireEvent, render } from "@testing-library/react";
import { useMemo } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { latestStateRef, StateCtx, useSelector } from "context/SyntheticsStateContext/utils";
import { getDefaultEntryField } from "domain/synthetics/sidecarOrders/utils";
import {
  INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
  writeStoredTradeOptions,
} from "domain/synthetics/trade/tradeboxStorage";
import { useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import { createMockMarketsData, createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import {
  BTC_ADDRESS,
  BTC_TOKEN,
  ETH_ADDRESS,
  ETH_TOKEN,
  NATIVE_ETH_ADDRESS,
  NATIVE_ETH_TOKEN,
  USDC_ADDRESS,
  USDC_TOKEN,
} from "domain/testUtils/mockTokens";
import { ARBITRUM } from "sdk/configs/chains";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { getChartOrderPriceInputValue, useChartContextMenu } from "../useChartContextMenu";

vi.mock("context/SettingsContext/SettingsContextProvider", async (original) => ({
  ...(await original<typeof import("context/SettingsContext/SettingsContextProvider")>()),
  useSettings: () => ({ savedAllowedSlippage: 30, savedTwapNumberOfParts: 5, expressOrdersEnabled: false }),
}));
vi.mock("lib/chains", async (original) => ({
  ...(await original<typeof import("lib/chains")>()),
  useChainId: () => ({ networkId: 42161 }),
}));

vi.mock("domain/synthetics/tokens/useTokenAllowanceData", () => ({
  useTokensAllowanceData: () => ({ tokensAllowanceData: undefined, isLoaded: false }),
}));
vi.mock("domain/multichain/useEmptyGmxAccounts", () => ({
  useEmptyGmxAccounts: () => ({ emptyGmxAccounts: undefined }),
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
  it.each([true, false])(
    "keeps the ETH short limit price from Swap when the form is already mounted: %s TRD-186",
    async (initiallyMounted) => {
      i18n.load("en", {});
      i18n.activate("en");
      const tokensData = {
        [NATIVE_ETH_ADDRESS]: NATIVE_ETH_TOKEN,
        [ETH_ADDRESS]: ETH_TOKEN,
        [BTC_ADDRESS]: BTC_TOKEN,
        [USDC_ADDRESS]: USDC_TOKEN,
      };
      const eth = createMockMarketInfo(NATIVE_ETH_TOKEN, { longToken: ETH_TOKEN });
      const btc = createMockMarketInfo(BTC_TOKEN, {
        marketTokenAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
        indexTokenAddress: BTC_ADDRESS,
        longTokenAddress: BTC_ADDRESS,
        longToken: BTC_TOKEN,
      });
      const marketsInfoData = { [eth.marketTokenAddress]: eth, [btc.marketTokenAddress]: btc };
      const marketsData = createMockMarketsData([eth, btc]);
      const state = createMockSyntheticsState({ tokensData });
      writeStoredTradeOptions(ARBITRUM, {
        ...INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
        tradeType: TradeType.Swap,
        tradeMode: TradeMode.Market,
        tokens: {
          indexTokenAddress: BTC_ADDRESS,
          swapToTokenAddress: NATIVE_ETH_ADDRESS,
          fromTokenAddress: USDC_ADDRESS,
        },
        markets: { [BTC_ADDRESS]: { long: btc.marketTokenAddress, short: btc.marketTokenAddress } },
      });
      function PriceField() {
        const tradebox = useSelector((s) => s.tradebox);
        return (
          <input
            aria-label="Limit price"
            data-token={tradebox.toTokenAddress}
            data-side={tradebox.tradeType}
            data-mode={tradebox.tradeMode}
            value={tradebox.triggerPriceInputValue}
            onChange={(e) => tradebox.setTriggerPriceInputValue(e.target.value)}
          />
        );
      }
      function Menu() {
        const { getContextMenuItems } = useChartContextMenu(1, { current: null }, false);
        return (
          <>
            {getContextMenuItems(2079.85).map((item) => (
              <button key={item.text} onClick={item.click}>
                {item.text}
              </button>
            ))}
          </>
        );
      }
      function App({ showForm }: { showForm: boolean }) {
        const tradebox = useTradeboxState(ARBITRUM, true, {
          networkId: ARBITRUM,
          marketsData,
          marketsInfoData,
          tokensData,
          srcChainId: undefined,
        });
        const value = useMemo(() => ({ ...state, tradebox }), [tradebox]);
        latestStateRef.current = value;
        return (
          <StateCtx.Provider value={value}>
            <Menu />
            {showForm && <PriceField />}
          </StateCtx.Provider>
        );
      }
      const renderApp = (showForm: boolean) => (
        <MemoryRouter>
          <App showForm={showForm} />
        </MemoryRouter>
      );
      const view = render(renderApp(initiallyMounted));
      try {
        fireEvent.click(view.getByRole("button", { name: /Set short Limit/ }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        view.rerender(renderApp(true));
        const field = view.getByLabelText("Limit price") as HTMLInputElement;
        expect(field.dataset.token).toBe(NATIVE_ETH_ADDRESS);
        expect(field.dataset.side).toBe(TradeType.Short);
        expect(field.dataset.mode).toBe(TradeMode.Limit);
        expect(field.value).toBe("2079.85");
        fireEvent.change(field, { target: { value: "2100" } });
        expect(field.value).toBe("2100");
        view.rerender(renderApp(false));
        view.rerender(renderApp(true));
        const remountedField = view.getByLabelText("Limit price") as HTMLInputElement;
        expect(remountedField.value).toBe("2100");
        act(() => latestStateRef.current!.tradebox.setTradeMode(TradeMode.Market));
        act(() => latestStateRef.current!.tradebox.setTradeMode(TradeMode.Limit));
        expect(remountedField.value).toBe("");
      } finally {
        view.unmount();
        latestStateRef.current = null;
        localStorage.clear();
      }
    }
  );
});
