import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

import { getApiRolloutBucket } from "./apiRolloutBucket";
import { API_UI_FLAGS, type ApiUiFlagName, useIsApiSdkEnabled } from "./useIsApiSdkEnabled";
import { useUiFlagsRequest } from "./useUiFlagsRequest";

vi.mock("config/env", async (importOriginal) => ({ ...(await importOriginal<object>()), isDevelopment: () => false }));
vi.mock("./apiRolloutBucket", () => ({ getApiRolloutBucket: vi.fn() }));
vi.mock("./useUiFlagsRequest", () => ({ useUiFlagsRequest: vi.fn() }));

describe("useIsApiSdkEnabled", () => {
  it.each<{ flag: ApiUiFlagName; enabled: string[]; bucket: number; expected: boolean }>([
    { flag: API_UI_FLAGS.wsPrices, enabled: ["wsPrices", "ws10"], bucket: 9, expected: true },
    { flag: API_UI_FLAGS.wsPrices, enabled: ["wsPrices", "ws10"], bucket: 10, expected: false },
    { flag: API_UI_FLAGS.wsPrices, enabled: ["wsPrices", "ws1", "ws50"], bucket: 30, expected: true },
    { flag: API_UI_FLAGS.wsCandles, enabled: ["wsCandles", "ws100"], bucket: 99, expected: true },
    { flag: API_UI_FLAGS.wsPrices, enabled: ["wsPrices", "api100"], bucket: 0, expected: false },
    { flag: API_UI_FLAGS.wsPrices, enabled: ["ws100"], bucket: 0, expected: false },
    { flag: API_UI_FLAGS.markets, enabled: ["apiMarkets", "ws100"], bucket: 0, expected: false },
    { flag: API_UI_FLAGS.markets, enabled: ["apiMarkets", "api30"], bucket: 29, expected: true },
  ])("$flag with $enabled at bucket $bucket: $expected", ({ flag, enabled, bucket, expected }) => {
    const uiFlags = Object.fromEntries(enabled.map((name) => [name, { enabled: true }]));
    vi.mocked(useUiFlagsRequest).mockReturnValue({ uiFlags } as ReturnType<typeof useUiFlagsRequest>);
    vi.mocked(getApiRolloutBucket).mockReturnValue(bucket);

    expect(useIsApiSdkEnabled(flag, ARBITRUM)).toBe(expected);
  });
});
