import { describe, expect, it } from "vitest";

import type { IHttp } from "utils/http/types";
import { fetchApiPositionsInfo } from "utils/positions/api";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

function createApi(response: unknown): IHttp {
  return {
    url: "https://example.test",
    fetchJson: async <TResult>() => response as TResult,
    postJson: async () => {
      throw new Error("Unexpected POST request");
    },
  };
}

function fetchPositions(response: unknown) {
  return fetchApiPositionsInfo(
    { api: createApi(response) },
    {
      address: ACCOUNT,
      includeRelatedOrders: true,
    }
  );
}

describe("position API validation", () => {
  it.each([
    ["negative", "-123", -123n],
    ["zero", "0", 0n],
    ["positive", "123", 123n],
  ])("deserializes a %s positionValueInUsd", async (_label, serialized, expected) => {
    const result = await fetchPositions([
      {
        key: "position-key",
        positionValueInUsd: serialized,
      },
    ]);

    expect(result[0].positionValueInUsd).toBe(expected);
  });

  it("rejects a missing positionValueInUsd", async () => {
    await expect(fetchPositions([{ key: "position-key" }])).rejects.toThrow(
      "Invalid /v1/positions response for position-key: missing positionValueInUsd"
    );
  });

  it.each(["invalid", 0, null, {}])("rejects malformed positionValueInUsd: %s", async (positionValueInUsd) => {
    await expect(fetchPositions([{ key: "position-key", positionValueInUsd }])).rejects.toThrow(
      "positionValueInUsd must be bigint"
    );
  });

  it.each([null, {}])("rejects a non-array response: %s", async (response) => {
    await expect(fetchPositions(response)).rejects.toThrow("Invalid /v1/positions response: expected an array");
  });

  it.each([null, "position"])("rejects a malformed array record: %s", async (record) => {
    await expect(fetchPositions([record])).rejects.toThrow(
      "Invalid /v1/positions response at index 0: expected an object"
    );
  });

  it("rejects an array as an array record", async () => {
    await expect(fetchPositions([[]])).rejects.toThrow("Invalid /v1/positions response at index 0: expected an object");
  });
});
