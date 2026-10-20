import fetch from "cross-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import graphqlFetcher from "./utils";

vi.mock("cross-fetch", () => ({
  default: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

function mockResponse(body: unknown) {
  mockedFetch.mockResolvedValueOnce({
    json: vi.fn().mockResolvedValue(body),
    ok: true,
    status: 200,
  } as unknown as Awaited<ReturnType<typeof fetch>>);
}

const partialResponse = { data: { value: "partial" }, errors: [{ message: "Invalid account" }] };

describe("graphqlFetcher", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each([
    ["keeps legacy partial data by default", partialResponse, false, { value: "partial" }, undefined],
    ["rejects GraphQL errors in strict mode", partialResponse, true, undefined, "GraphQL error: Invalid account"],
    ["rejects a missing data field in strict mode", {}, true, undefined, "GraphQL response is missing data"],
  ])("%s", async (_, body, strict, data, error) => {
    mockResponse(body);
    const request = graphqlFetcher("https://example.com/graphql", "query Test", undefined, { strict });

    if (error) {
      await expect(request).rejects.toThrow(error);
    } else {
      await expect(request).resolves.toEqual(data);
    }
  });
});
