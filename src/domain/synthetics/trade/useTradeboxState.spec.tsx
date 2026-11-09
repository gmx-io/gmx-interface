import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getLeverageKey, getSyntheticsTradeOptionsKey } from "config/localStorage";
import type { OrderInfo } from "domain/synthetics/orders";
import { createMockMarketInfo, createMockMarketsData, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { BTC_ADDRESS, BTC_TOKEN, ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { ARBITRUM, type NetworkId, SOLANA_NETWORK_ID } from "sdk/configs/chains";
import { OrderType } from "sdk/utils/orders/types";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import {
  INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
  readStoredTradeOptions,
  writeStoredTradeOptions,
} from "./tradeboxStorage";
import { useTradeboxState } from "./useTradeboxState";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ savedAllowedSlippage: 30, savedTwapNumberOfParts: 5, expressOrdersEnabled: false }),
}));

vi.mock("domain/synthetics/tokens/useTokenAllowanceData", () => ({
  useTokensAllowanceData: () => ({ tokensAllowanceData: undefined, isLoaded: false }),
}));

vi.mock("domain/multichain/useEmptyGmxAccounts", () => ({
  useEmptyGmxAccounts: () => ({ emptyGmxAccounts: undefined }),
}));

// real WBTC-USDC Arbitrum market
const BTC_MARKET_ADDRESS = "0x47c031236e19d024b42f8AE6780E44A573170703";

const MARKETS_INFO_DATA = {
  [MOCK_MARKET_ADDRESS]: createMockMarketInfo(),
  [BTC_MARKET_ADDRESS]: createMockMarketInfo(BTC_TOKEN, {
    marketTokenAddress: BTC_MARKET_ADDRESS,
    indexTokenAddress: BTC_ADDRESS,
    longTokenAddress: BTC_ADDRESS,
    longToken: BTC_TOKEN,
    name: "BTC/USD [BTC-USDC]",
  }),
};
const MARKETS_DATA = createMockMarketsData(Object.values(MARKETS_INFO_DATA));
const TOKENS_DATA = { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: ETH_TOKEN, [BTC_ADDRESS]: BTC_TOKEN };

function seedNetwork(networkId: NetworkId, p: { tradeType: TradeType; indexTokenAddress: string; market: string }) {
  writeStoredTradeOptions(networkId, {
    ...INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
    tradeType: p.tradeType,
    tokens: { indexTokenAddress: p.indexTokenAddress, fromTokenAddress: USDC_ADDRESS },
    markets: { [p.indexTokenAddress]: { long: p.market, short: p.market } },
  });
}

let tradebox: ReturnType<typeof useTradeboxState>;

// Solana is selected while globals.chainId stays Arbitrum, so both slots see the same markets
function Harness({ networkId }: { networkId: NetworkId }) {
  tradebox = useTradeboxState(ARBITRUM, true, {
    networkId,
    marketsData: MARKETS_DATA,
    marketsInfoData: MARKETS_INFO_DATA,
    tokensData: TOKENS_DATA,
    srcChainId: undefined,
  });

  return null;
}

function renderTradebox(networkId: NetworkId) {
  return render(
    <MemoryRouter>
      <Harness networkId={networkId} />
    </MemoryRouter>
  );
}

function readLeverage(networkId: NetworkId) {
  return JSON.parse(localStorage.getItem(JSON.stringify(getLeverageKey(networkId)))!);
}

describe("useTradeboxState network isolation", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it.each([ARBITRUM, SOLANA_NETWORK_ID] as const)(
    "restores and accepts Swap only on supported networks FESOL-15 (%s)",
    (networkId) => {
      seedNetwork(networkId, {
        tradeType: TradeType.Swap,
        indexTokenAddress: ETH_ADDRESS,
        market: MOCK_MARKET_ADDRESS,
      });
      const key = JSON.stringify(getSyntheticsTradeOptionsKey(networkId));
      const saved = JSON.parse(localStorage.getItem(key)!);
      saved.tokens.swapToTokenAddress = BTC_ADDRESS;
      saved.tradeMode = TradeMode.Twap;
      localStorage.setItem(key, JSON.stringify(saved));

      const expectedType = networkId === SOLANA_NETWORK_ID ? TradeType.Long : TradeType.Swap;
      renderTradebox(networkId);
      expect(tradebox.tradeType).toBe(expectedType);
      expect(tradebox.toTokenAddress).toBe(networkId === SOLANA_NETWORK_ID ? ETH_ADDRESS : BTC_ADDRESS);
      expect(tradebox.tradeMode).toBe(networkId === SOLANA_NETWORK_ID ? TradeMode.Market : TradeMode.Twap);
      expect(JSON.parse(localStorage.getItem(key)!).tradeType).toBe(expectedType);

      act(() => tradebox.setTradeConfig({ tradeType: TradeType.Swap, toTokenAddress: BTC_ADDRESS }));
      expect(tradebox.tradeType).toBe(expectedType);
      expect(tradebox.availableTradeModes.length).toBeGreaterThan(0);
      expect(JSON.parse(localStorage.getItem(key)!).tradeType).toBe(expectedType);
    }
  );

  it.each(["trade type", "trade config", "swap order"] as const)(
    "preserves the Solana Short Limit form when an unsupported Swap is requested via %s",
    (entry) => {
      seedNetwork(SOLANA_NETWORK_ID, {
        tradeType: TradeType.Short,
        indexTokenAddress: ETH_ADDRESS,
        market: MOCK_MARKET_ADDRESS,
      });
      renderTradebox(SOLANA_NETWORK_ID);
      act(() => {
        tradebox.setTradeMode(TradeMode.Limit);
        tradebox.setFromTokenInputValue("123");
      });
      const previous = readStoredTradeOptions(SOLANA_NETWORK_ID);
      expect(tradebox.tradeType).toBe(TradeType.Short);
      expect(tradebox.tradeMode).toBe(TradeMode.Limit);

      act(() => {
        if (entry === "trade type") {
          tradebox.setTradeType(TradeType.Swap);
        } else if (entry === "trade config") {
          tradebox.setTradeConfig({ tradeType: TradeType.Swap, toTokenAddress: BTC_ADDRESS });
        } else {
          tradebox.setActiveOrder({
            orderType: OrderType.LimitSwap,
            isTwap: false,
            isSwap: true,
            isLong: true,
            marketAddress: MOCK_MARKET_ADDRESS,
            swapPath: [MOCK_MARKET_ADDRESS],
            initialCollateralTokenAddress: USDC_ADDRESS,
            initialCollateralToken: USDC_TOKEN,
            targetCollateralToken: BTC_TOKEN,
          } as OrderInfo);
        }
      });

      expect(tradebox.tradeType).toBe(TradeType.Short);
      expect(tradebox.tradeMode).toBe(TradeMode.Limit);
      expect(tradebox.fromTokenInputValue).toBe("123");
      expect(tradebox.toTokenAddress).toBe(ETH_ADDRESS);
      expect(readStoredTradeOptions(SOLANA_NETWORK_ID)).toEqual(previous);
    }
  );

  // The app remounts the tree on a network switch (SWRConfig key), a rerender covers the in-place sync effect
  it.each(["remount", "rerender"] as const)(
    "keeps Arbitrum and Solana selections and leverage apart when switching away and back (%s)",
    (switchMode) => {
      seedNetwork(ARBITRUM, { tradeType: TradeType.Short, indexTokenAddress: BTC_ADDRESS, market: BTC_MARKET_ADDRESS });
      localStorage.setItem(JSON.stringify(getLeverageKey(ARBITRUM)), JSON.stringify(5));

      let view = renderTradebox(ARBITRUM);
      const switchTo = (networkId: NetworkId) => {
        if (switchMode === "remount") {
          view.unmount();
          view = renderTradebox(networkId);
        } else {
          view.rerender(
            <MemoryRouter>
              <Harness networkId={networkId} />
            </MemoryRouter>
          );
        }
      };

      expect(tradebox.tradeType).toBe(TradeType.Short);
      expect(tradebox.toTokenAddress).toBe(BTC_ADDRESS);
      expect(tradebox.leverageOption).toBe(5);

      switchTo(SOLANA_NETWORK_ID);

      // empty Solana slot falls back to defaults instead of inheriting Arbitrum values
      expect(tradebox.leverageOption).toBe(2);
      expect(tradebox.toTokenAddress).not.toBe(BTC_ADDRESS);

      act(() => {
        tradebox.setTradeType(TradeType.Long);
        tradebox.setToTokenAddress(ETH_ADDRESS, MOCK_MARKET_ADDRESS);
        tradebox.setLeverageOption(10);
      });

      expect(readStoredTradeOptions(ARBITRUM)?.tradeType).toBe(TradeType.Short);
      expect(readStoredTradeOptions(ARBITRUM)?.tokens.indexTokenAddress).toBe(BTC_ADDRESS);
      expect(readLeverage(ARBITRUM)).toBe(5);

      switchTo(ARBITRUM);

      expect(tradebox.tradeType).toBe(TradeType.Short);
      expect(tradebox.toTokenAddress).toBe(BTC_ADDRESS);
      expect(tradebox.leverageOption).toBe(5);

      switchTo(SOLANA_NETWORK_ID);

      expect(tradebox.tradeType).toBe(TradeType.Long);
      expect(tradebox.toTokenAddress).toBe(ETH_ADDRESS);
      expect(tradebox.leverageOption).toBe(10);
    }
  );
});
