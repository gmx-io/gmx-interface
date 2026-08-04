import { describe, expect, it } from "vitest";

import type { IHttp } from "utils/http/types";
import { fetchApiMarketsConfig, fetchApiMarketsInfo, fetchApiMarketsValues } from "utils/markets/api";

const MARKET_ADDRESS = "0x1111111111111111111111111111111111111111";
const VIRTUAL_INDEX_TOKEN_ID = "0x2222222222222222222222222222222222222222222222222222222222222222";

const CONFIG_FIELD_CASES = [
  ["marketTokenAddress", 1, "string"],
  ["useOpenInterestInTokensForBalance", "true", "boolean"],
  ["maxCollateralSumLongTokenLong", "invalid", "bigint"],
  ["maxCollateralSumLongTokenShort", "invalid", "bigint"],
  ["maxCollateralSumShortTokenLong", "invalid", "bigint"],
  ["maxCollateralSumShortTokenShort", "invalid", "bigint"],
  ["minFundingIncreaseRatePerSecond", "invalid", "bigint"],
  ["minFundingFactorPerSecondLong", "invalid", "bigint"],
  ["minFundingFactorPerSecondShort", "invalid", "bigint"],
  ["maxFundingFactorPerSecondLong", "invalid", "bigint"],
  ["maxFundingFactorPerSecondShort", "invalid", "bigint"],
  ["virtualIndexTokenId", 1, "string"],
] as const;

const VALUES_FIELD_CASES = [
  ["marketTokenAddress", 1, "string"],
  ["virtualInventoryForPositions", "invalid", "bigint"],
  ["virtualInventoryForPositionsInTokens", "invalid", "bigint"],
  ["updatedAt", "invalid", "numberOrNull"],
] as const;

function createApi(response: unknown): IHttp {
  return {
    url: "https://example.test",
    fetchJson: async <TResult>() => response as TResult,
    postJson: async () => {
      throw new Error("Unexpected POST request");
    },
  };
}

function createMarketConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    marketTokenAddress: MARKET_ADDRESS,
    useOpenInterestInTokensForBalance: true,
    maxCollateralSumLongTokenLong: "1",
    maxCollateralSumLongTokenShort: "2",
    maxCollateralSumShortTokenLong: "3",
    maxCollateralSumShortTokenShort: "4",
    minFundingIncreaseRatePerSecond: "5",
    minFundingFactorPerSecondLong: "6",
    minFundingFactorPerSecondShort: "7",
    maxFundingFactorPerSecondLong: "8",
    maxFundingFactorPerSecondShort: "9",
    virtualIndexTokenId: VIRTUAL_INDEX_TOKEN_ID,
    ...overrides,
  };
}

function createMarketValues(
  virtualInventoryForPositionsInTokens: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    marketTokenAddress: MARKET_ADDRESS,
    virtualInventoryForPositions: "-10",
    virtualInventoryForPositionsInTokens,
    updatedAt: 123,
    ...overrides,
  };
}

function createMarketInfo(virtualInventoryForPositionsInTokens = "-20"): Record<string, unknown> {
  const marketInfo = {
    ...createMarketConfig(),
    ...createMarketValues(virtualInventoryForPositionsInTokens),
  };

  delete marketInfo.updatedAt;

  return marketInfo;
}

function omitField(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const result = { ...record };
  delete result[field];
  return result;
}

describe("market API validation", () => {
  describe("fetchApiMarketsValues", () => {
    it.each([
      ["negative", "-123", -123n],
      ["zero", "0", 0n],
      ["positive", "123", 123n],
    ])("deserializes %s signed token inventory", async (_label, serialized, expected) => {
      const result = await fetchApiMarketsValues({
        api: createApi([createMarketValues(serialized)]),
      });

      expect(result[0].virtualInventoryForPositions).toBe(-10n);
      expect(result[0].virtualInventoryForPositionsInTokens).toBe(expected);
      expect(result[0].updatedAt).toBe(123);
    });

    it("accepts a null freshness timestamp", async () => {
      const result = await fetchApiMarketsValues({
        api: createApi([createMarketValues("0", { updatedAt: null })]),
      });

      expect(result[0].updatedAt).toBeNull();
    });

    it.each(VALUES_FIELD_CASES)("rejects a missing %s field", async (field) => {
      const response = omitField(createMarketValues("0"), field);

      await expect(fetchApiMarketsValues({ api: createApi([response]) })).rejects.toThrow(`missing ${field}`);
    });

    it.each(VALUES_FIELD_CASES)("rejects malformed %s", async (field, invalidValue, expectedType) => {
      const response = createMarketValues("0", { [field]: invalidValue });

      await expect(fetchApiMarketsValues({ api: createApi([response]) })).rejects.toThrow(
        `${field} must be ${expectedType}`
      );
    });
  });

  describe("fetchApiMarketsConfig", () => {
    it("deserializes required v2.2c bigint fields", async () => {
      const result = await fetchApiMarketsConfig({
        api: createApi([createMarketConfig()]),
      });

      expect(result[0]).toMatchObject({
        maxCollateralSumLongTokenLong: 1n,
        maxCollateralSumLongTokenShort: 2n,
        maxCollateralSumShortTokenLong: 3n,
        maxCollateralSumShortTokenShort: 4n,
        minFundingIncreaseRatePerSecond: 5n,
        minFundingFactorPerSecondLong: 6n,
        minFundingFactorPerSecondShort: 7n,
        maxFundingFactorPerSecondLong: 8n,
        maxFundingFactorPerSecondShort: 9n,
        virtualIndexTokenId: VIRTUAL_INDEX_TOKEN_ID,
      });
    });

    it.each(CONFIG_FIELD_CASES)("rejects a missing %s field", async (field) => {
      const response = omitField(createMarketConfig(), field);

      await expect(fetchApiMarketsConfig({ api: createApi([response]) })).rejects.toThrow(`missing ${field}`);
    });

    it.each(CONFIG_FIELD_CASES)("rejects malformed %s", async (field, invalidValue, expectedType) => {
      const response = createMarketConfig({ [field]: invalidValue });

      await expect(fetchApiMarketsConfig({ api: createApi([response]) })).rejects.toThrow(
        `${field} must be ${expectedType}`
      );
    });
  });

  describe("fetchApiMarketsInfo", () => {
    it("validates and deserializes the combined market response", async () => {
      const result = await fetchApiMarketsInfo({
        api: createApi([createMarketInfo("-20")]),
      });

      expect(result[0].virtualInventoryForPositions).toBe(-10n);
      expect(result[0].virtualInventoryForPositionsInTokens).toBe(-20n);
      expect(result[0].maxCollateralSumLongTokenLong).toBe(1n);
      expect(result[0].virtualIndexTokenId).toBe(VIRTUAL_INDEX_TOKEN_ID);
    });

    it.each(["virtualIndexTokenId", "virtualInventoryForPositionsInTokens"])(
      "rejects a combined response missing %s",
      async (field) => {
        const response = omitField(createMarketInfo(), field);

        await expect(fetchApiMarketsInfo({ api: createApi([response]) })).rejects.toThrow(`missing ${field}`);
      }
    );

    it.each([
      ["virtualIndexTokenId", 1, "string"],
      ["virtualInventoryForPositionsInTokens", "invalid", "bigint"],
    ] as const)("rejects malformed %s in the combined response", async (field, invalidValue, expectedType) => {
      const response = createMarketInfo();
      response[field] = invalidValue;

      await expect(fetchApiMarketsInfo({ api: createApi([response]) })).rejects.toThrow(
        `${field} must be ${expectedType}`
      );
    });
  });

  it.each([
    ["info", fetchApiMarketsInfo],
    ["config", fetchApiMarketsConfig],
    ["values", fetchApiMarketsValues],
  ] as const)("rejects a non-array /markets/%s response", async (_endpoint, fetcher) => {
    await expect(fetcher({ api: createApi({}) })).rejects.toThrow("expected an array");
  });

  it.each([
    ["info", fetchApiMarketsInfo],
    ["config", fetchApiMarketsConfig],
    ["values", fetchApiMarketsValues],
  ] as const)("rejects a malformed record in the /markets/%s array", async (_endpoint, fetcher) => {
    await expect(fetcher({ api: createApi([null]) })).rejects.toThrow("at index 0: expected an object");
  });
});
