import { cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, AVALANCHE, SOLANA_NETWORK_ID, type NetworkId } from "config/chains";
import { GmxSdkProvider } from "context/GmxSdkContext/GmxSdkContext";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import { getApiUrl } from "sdk/configs/api";
import { HttpClient } from "sdk/utils/http/http";
import type { FetchJsonOptions } from "sdk/utils/http/types";
import type { RatesSnapshot } from "sdk/utils/rates/types";

import { useRateSnapshots, type RateTimeframe } from "./useRateSnapshots";

const selection = vi.hoisted(() => ({ networkId: -501, chainId: 42161 }));
vi.mock("lib/chains", () => ({ useChainId: () => selection }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setAbFlagEnabled("useTestApi", false);
});

it("uses actual Solana data and isolates history by network, API environment and period TRD-91", async () => {
  const solanaMarket = "6UU9sF5fryafHDYPcmVcV7ucfnYs6iMVcvb8p7SBQgTc";
  let address: string | undefined = solanaMarket;
  let timeframe: RateTimeframe = "7d";
  let fail = false;
  const responses = new Map<string, RatesSnapshot[]>();
  const swrConfig = { provider: () => new Map(), shouldRetryOnError: false, dedupingInterval: 0 };
  vi.spyOn(HttpClient.prototype, "fetchJson").mockImplementation(async function <T>(
    this: HttpClient,
    path: string,
    opts?: FetchJsonOptions<T>
  ): Promise<T> {
    if (fail) throw new Error("Service unavailable");
    const key = `${this.url}${path}:${opts?.query?.period}`;
    const rate: RatesSnapshot = {
      timestamp: 1795078800,
      fundingRateLong: "-1",
      fundingRateShort: "1",
      borrowingRateLong: "1",
      borrowingRateShort: "0",
      netRateLong: "-2",
      netRateShort: "1",
    };
    const rates = [{ ...rate, timestamp: rate.timestamp + 3600 }, rate];
    responses.set(key, [...rates].reverse());
    return [
      {
        marketAddress: address === solanaMarket ? address.toLowerCase() : "0x0000000000000000000000000000000000000001",
        ratesSnapshots: [],
      },
      { marketAddress: address, ratesSnapshots: rates },
    ] as T;
  });
  let result!: ReturnType<typeof useRateSnapshots>;
  function Probe() {
    result = useRateSnapshots({ marketAddress: address, timeframe });
    return null;
  }
  const tree = () => (
    <SWRConfig value={swrConfig}>
      <GmxSdkProvider>
        <StateCtx.Provider value={{ globals: { chainId: selection.chainId } } as SyntheticsState}>
          <Probe />
        </StateCtx.Provider>
      </GmxSdkProvider>
    </SWRConfig>
  );
  const { rerender } = render(tree());
  for (const [networkId, chainId, testApi, period] of [
    [SOLANA_NETWORK_ID, ARBITRUM, false, "7d"],
    [ARBITRUM, ARBITRUM, false, "7d"],
    [ARBITRUM, ARBITRUM, true, "7d"],
    [SOLANA_NETWORK_ID, ARBITRUM, true, "1d"],
    [ARBITRUM, AVALANCHE, false, "30d"],
  ] as const) {
    selection.networkId = networkId;
    selection.chainId = chainId;
    timeframe = period;
    address = networkId === SOLANA_NETWORK_ID ? solanaMarket : "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
    setAbFlagEnabled("useTestApi", testApi);
    rerender(tree());
    const host = getApiUrl(
      (networkId === SOLANA_NETWORK_ID ? networkId : chainId) as NetworkId,
      testApi && networkId !== SOLANA_NETWORK_ID ? "test" : "production"
    );
    const responseKey = `${host}/v1/rates:${period}`;
    await waitFor(() => expect(responses.has(responseKey)).toBe(true));
    await waitFor(() => expect(result.snapshots?.[0]).toBe(responses.get(responseKey)?.[0]));
  }
  fail = true;
  timeframe = "1d";
  rerender(tree());
  await waitFor(() => expect(result.error?.message).toBe("Service unavailable"));
  expect(result.snapshots).toBeUndefined();
  expect(result.isLoading).toBe(false);
});
