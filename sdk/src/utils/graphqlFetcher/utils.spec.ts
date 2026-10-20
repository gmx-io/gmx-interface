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

describe("graphqlFetcher", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("preserves legacy partial-data behavior by default", async () => {
    mockResponse({ data: { value: "partial" }, errors: [{ message: "Partial failure" }] });

    await expect(graphqlFetcher("https://example.com/graphql", "query Test")).resolves.toEqual({ value: "partial" });
  });

  it("rejects GraphQL errors in strict mode", async () => {
    mockResponse({ data: { value: "partial" }, errors: [{ message: "Invalid account" }] });

    await expect(
      graphqlFetcher("https://example.com/graphql", "query Test", undefined, { strict: true })
    ).rejects.toThrow("GraphQL error: Invalid account");
  });

  it("rejects a missing data field in strict mode", async () => {
    mockResponse({});

    await expect(
      graphqlFetcher("https://example.com/graphql", "query Test", undefined, { strict: true })
    ).rejects.toThrow("GraphQL response is missing data");
  });
});
