import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({
  isDevelopment: vi.fn(),
}));

import { ARBITRUM, ARBITRUM_SEPOLIA } from "../chains";
import { isDevelopment } from "../env";
import { getIndexerUrl } from "../indexers";
import { getIndexerUrlKey } from "../localStorage";

const mockIsDevelopment = vi.mocked(isDevelopment);

describe("incentives indexer URL", () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsDevelopment.mockReset();
  });

  it("uses gmx-test ivprod for local development", () => {
    mockIsDevelopment.mockReturnValue(true);

    expect(getIndexerUrl(ARBITRUM, "incentives")).toBe(
      "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivprod/api/graphql"
    );
  });

  it("uses gmx-test ivtest when selected", () => {
    mockIsDevelopment.mockReturnValue(true);

    expect(getIndexerUrl(ARBITRUM, "incentives", { incentivesTestSquid: "ivtest" })).toBe(
      "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivtest/api/graphql"
    );
  });

  it.each([true, false])("uses the deployed Sepolia squid with development=%s", (isDevelopment) => {
    mockIsDevelopment.mockReturnValue(isDevelopment);

    for (const incentivesTestSquid of ["ivprod", "ivtest"] as const) {
      expect(getIndexerUrl(ARBITRUM_SEPOLIA, "incentives", { incentivesTestSquid })).toBe(
        "https://gmx-test.squids.live/gmx-synthetics-arb-sepolia@ivtest/api/graphql"
      );
      expect(getIndexerUrl(ARBITRUM_SEPOLIA, "subsquid", { incentivesTestSquid })).toBe(
        "https://gmx.squids.live/gmx-synthetics-arb-sepolia:prod/api/graphql"
      );
    }
  });

  it("keeps Sepolia incentives overrides separate from Arbitrum", () => {
    mockIsDevelopment.mockReturnValue(true);
    localStorage.setItem(getIndexerUrlKey(ARBITRUM_SEPOLIA, "incentives"), "https://example.com/sepolia/graphql");

    expect(getIndexerUrl(ARBITRUM_SEPOLIA, "incentives")).toBe("https://example.com/sepolia/graphql");
    expect(getIndexerUrl(ARBITRUM, "incentives")).toBe(
      "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivprod/api/graphql"
    );
  });

  it("prefers an explicit development override", () => {
    mockIsDevelopment.mockReturnValue(true);
    localStorage.setItem(getIndexerUrlKey(ARBITRUM, "incentives"), "https://example.com/custom/graphql");

    expect(getIndexerUrl(ARBITRUM, "incentives", { incentivesTestSquid: "ivtest" })).toBe(
      "https://example.com/custom/graphql"
    );
  });

  it("keeps production on the canonical endpoint", () => {
    mockIsDevelopment.mockReturnValue(false);

    expect(getIndexerUrl(ARBITRUM, "incentives", { incentivesTestSquid: "ivtest" })).toBe(
      "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql"
    );
  });

  it("does not repoint the generic Arbitrum Subsquid endpoint", () => {
    mockIsDevelopment.mockReturnValue(false);

    expect(getIndexerUrl(ARBITRUM, "subsquid")).toBe(
      "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql"
    );
  });

  it("keeps the generic Subsquid endpoint off the incentives test squids in development", () => {
    mockIsDevelopment.mockReturnValue(true);

    expect(getIndexerUrl(ARBITRUM, "subsquid", { incentivesTestSquid: "ivtest" })).toBe(
      "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql"
    );
  });
});
