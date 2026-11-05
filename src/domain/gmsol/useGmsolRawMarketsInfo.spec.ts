import useSWR from "swr";
import { expect, it, vi } from "vitest";

import marketsConfig from "./api/__fixtures__/marketsConfig.json";
import marketsValues from "./api/__fixtures__/marketsValues.json";
import { useGmsolRawMarketsInfo } from "./useGmsolRawMarketsInfo";

vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useMemo: (fn: () => unknown) => fn(),
  useRef: (value: unknown) => ({ current: value }),
}));

const NOW = 1_792_000_000_000;
const values = (updatedAt: (index: number) => number | null) =>
  marketsValues.map((value, index) => ({ ...value, updatedAt: updatedAt(index) }));
const [firstMarket] = marketsConfig;

it.each`
  scenario                        | config                                                               | marketValues                                     | error                    | loading  | unavailable
  ${"loading"}                    | ${undefined}                                                         | ${undefined}                                     | ${undefined}             | ${true}  | ${false}
  ${"fresh"}                      | ${marketsConfig}                                                     | ${values(() => NOW)}                             | ${undefined}             | ${false} | ${false}
  ${"api error"}                  | ${marketsConfig}                                                     | ${values(() => NOW)}                             | ${new Error("HTTP 500")} | ${false} | ${true}
  ${"one market lags 11 s"}       | ${marketsConfig}                                                     | ${values((i) => (i === 0 ? NOW - 11_000 : NOW))} | ${undefined}             | ${false} | ${true}
  ${"lagging market is disabled"} | ${[{ ...firstMarket, isDisabled: true }, ...marketsConfig.slice(1)]} | ${values((i) => (i === 0 ? null : NOW))}         | ${undefined}             | ${false} | ${false}
  ${"market missing from values"} | ${marketsConfig}                                                     | ${values(() => NOW).slice(1)}                    | ${undefined}             | ${false} | ${true}
`("has no RPC fallback: $scenario", ({ config, marketValues, error, loading, unavailable }) => {
  vi.mocked(useSWR).mockImplementation(((key: readonly unknown[]) => {
    if (key[0] === "gmsolMarketsConfig") {
      return { data: config };
    }
    return { data: marketValues && { values: marketValues, receivedAt: NOW }, error };
  }) as unknown as typeof useSWR);

  const result = useGmsolRawMarketsInfo({ enabled: true });

  expect(result.isLoading).toBe(loading);
  expect(result.isUnavailable).toBe(unavailable);
  expect(result.rawMarketsInfoData !== undefined).toBe(!loading && !unavailable);
});
