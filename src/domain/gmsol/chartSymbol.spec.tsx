import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getGmsolTokenBySymbol } from "config/gmsol/tokenLookup";
import { getGmsolOracleSymbol } from "domain/gmsol/gmsolOracleUtils";
import { DataFeed } from "domain/tradingview/DataFeed";
import { getSymbolName } from "domain/tradingview/utils";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { TVChart } from "components/TVChart/TVChart";

const state = vi.hoisted(() => ({
  token: undefined as (Token & { prices: { minPrice: bigint; maxPrice: bigint } }) | undefined,
  provider: undefined as { getChartSymbol: (address: string) => string } | undefined,
  chart: undefined as { symbol: string; minPrice: bigint } | undefined,
}));
vi.mock("context/SyntheticsStateContext/utils", () => ({ useSelector: (selector: () => unknown) => selector() }));
vi.mock("context/SyntheticsStateContext/selectors/chartSelectors", () => ({
  selectChartToken: () => ({ chartToken: state.token, symbol: state.token?.symbol }),
}));
vi.mock("context/SyntheticsStateContext/selectors/chartSelectors/selectChartLines", () => ({
  selectChartLines: () => [],
}));
vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectSetIsCandlesLoaded: () => () => undefined,
}));
vi.mock("context/SyntheticsStateContext/selectors/statsSelectors", () => ({
  selectSelectedMarketVisualMultiplier: () => 1,
}));
vi.mock("context/SyntheticsStateContext/selectors/chartDataSelectors", () => ({
  selectChartDataProvider: () => state.provider,
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161 }) }));
vi.mock("lib/localStorage", () => ({ useLocalStorageSerializeKey: () => ["5m", () => undefined] }));
vi.mock("components/TVChartContainer/TVChartContainer", () => ({
  default: ({ chartToken }: { chartToken: typeof state.chart }) => {
    state.chart = chartToken;
    return null;
  },
}));
vi.mock("lib/errors", () => ({ parseError: (error: unknown) => error }));
vi.mock("lib/metrics", () => ({
  FreshnessMetricId: {},
  getRequestId: () => "chart-test",
  metrics: { startTimer: () => undefined, pushEvent: () => undefined, pushCounter: () => undefined },
}));
vi.mock("lib/metrics/reportFreshnessMetric", () => ({ freshnessMetrics: { reportThrottled: () => undefined } }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("resolves Solana wrapped assets without changing EVM symbols or token identity", async () => {
  vi.useFakeTimers();
  for (const [symbol, expected, solana] of [
    ["WSOL", "SOL", true],
    ["WGMX", "GMX", true],
    ["WETH", "WETH", false],
  ] as const) {
    const token = solana ? getGmsolTokenBySymbol(symbol)! : getTokenBySymbol(ARBITRUM, symbol);
    state.token = { ...token, prices: { minPrice: 123n * 10n ** 30n, maxPrice: 124n * 10n ** 30n } };
    state.provider = solana ? { getChartSymbol: getGmsolOracleSymbol } : undefined;
    const view = render(<TVChart />);
    const feed = new DataFeed(ARBITRUM, { fetchOracleCandles: async () => [] });
    try {
      feed.setTokenPriceGetter(() => state.chart!.minPrice);
      let resolved: string | undefined;
      feed.resolveSymbol(getSymbolName(state.chart!.symbol), (info) => {
        resolved = info.name;
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(resolved).toBe(expected);
      expect(state.chart!.minPrice).toBe(state.token.prices.minPrice);
      expect(state.token).toMatchObject({ symbol, address: token.address });
    } finally {
      feed.destroy();
      view.unmount();
    }
  }
});
