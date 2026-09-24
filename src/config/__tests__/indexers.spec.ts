import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({
  isDevelopment: vi.fn(),
}));

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE } from "../chains";
import { isDevelopment } from "../env";
import { getIndexerUrl } from "../indexers";
import { getIndexerUrlKey } from "../localStorage";

const mockIsDevelopment = vi.mocked(isDevelopment);

describe("rewards home incentives indexer", () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsDevelopment.mockReset();
    vi.stubEnv("VITE_APP_IS_HOME_SITE", "false");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([true, false])("uses ivprod for home with development=%s", (development) => {
    mockIsDevelopment.mockReturnValue(development);
    vi.stubEnv("VITE_APP_IS_HOME_SITE", "true");

    expect(getIndexerUrl(ARBITRUM, "incentives")).toBe(
      "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivprod/api/graphql"
    );
  });

  it.each([true, false])("keeps the app on the canonical endpoint with development=%s", (development) => {
    mockIsDevelopment.mockReturnValue(development);

    expect(getIndexerUrl(ARBITRUM, "incentives")).toBe(
      "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql"
    );
  });

  it("keeps other home data sources on their existing endpoints", () => {
    mockIsDevelopment.mockReturnValue(false);
    vi.stubEnv("VITE_APP_IS_HOME_SITE", "true");

    expect(getIndexerUrl(ARBITRUM, "subsquid")).toBe(
      "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql"
    );
    expect(getIndexerUrl(ARBITRUM_SEPOLIA, "subsquid")).toBe(
      "https://gmx.squids.live/gmx-synthetics-arb-sepolia:prod/api/graphql"
    );
    expect(getIndexerUrl(ARBITRUM_SEPOLIA, "incentives")).toBeUndefined();
    expect(getIndexerUrl(AVALANCHE, "incentives")).toBeUndefined();
  });

  it("prefers an explicit development override", () => {
    mockIsDevelopment.mockReturnValue(true);
    vi.stubEnv("VITE_APP_IS_HOME_SITE", "true");
    localStorage.setItem(getIndexerUrlKey(ARBITRUM, "incentives"), "https://example.com/custom/graphql");

    expect(getIndexerUrl(ARBITRUM, "incentives")).toBe("https://example.com/custom/graphql");
  });
});
