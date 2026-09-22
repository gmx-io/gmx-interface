import fetch from "cross-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import graphqlFetcher from "./utils";

vi.mock("cross-fetch", () => ({
  default: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

function mockResponse(body: unknown, status = 200) {
  mockedFetch.mockResolvedValueOnce({
    json: vi.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Awaited<ReturnType<typeof fetch>>);
}

describe("graphqlFetcher", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("returns GraphQL data and sends variables", async () => {
    mockResponse({ data: { value: "ok" } });

    await expect(graphqlFetcher("https://example.com/graphql", "query Test", { account: "0x123" })).resolves.toEqual({
      value: "ok",
    });

    expect(mockedFetch).toHaveBeenCalledWith("https://example.com/graphql", {
      body: JSON.stringify({ query: "query Test", variables: { account: "0x123" } }),
      headers: { "Content-type": "application/json" },
      method: "POST",
    });
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

  it("rejects unsuccessful HTTP responses", async () => {
    mockResponse({}, 503);

    await expect(graphqlFetcher("https://example.com/graphql", "query Test")).rejects.toThrow("HTTP error: 503");
  });
});
