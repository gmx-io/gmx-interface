import { describe, expect, it } from "vitest";

import { arbitrumSdk } from "clients/v1/testUtil";

// Skipped in CI (FEDEV-4029): hits the live gmxinfra API and is flaky (FetchError: Premature close).
describe.skip("Positions", () => {
  describe("getPositions", () => {
    it("should be able to get positions data", { timeout: 90_000 }, async () => {
      const { marketsInfoData, tokensData } = (await arbitrumSdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const positions = await arbitrumSdk.positions.getPositions({ tokensData, marketsData: marketsInfoData });

      expect(positions).toBeDefined();
    });

    it("should be able to get positions info", { timeout: 90_000 }, async () => {
      const { marketsInfoData, tokensData } = (await arbitrumSdk.markets.getMarketsInfo()) ?? {};

      if (!tokensData || !marketsInfoData) {
        throw new Error("Tokens data or markets info is not available");
      }

      const positions = await arbitrumSdk.positions.getPositionsInfo({
        tokensData,
        marketsInfoData,
        showPnlInLeverage: true,
      });

      expect(positions).toBeDefined();
    });
  });
});
