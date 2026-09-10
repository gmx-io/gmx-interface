import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpClient } from "utils/http/http";
import type { IHttp } from "utils/http/types";
import {
  fetchApiProtocolStatsSources,
  fetchApiProtocolStatsSummary,
  fetchApiProtocolStatsTimeseries,
} from "utils/stats/api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("cross-fetch", () => ({ default: fetchMock }));

const API_URL = "https://example.test";
const FROM = 1_756_857_600;
const TO = 1_759_363_200;

type Call = { path: string; query: Record<string, unknown> | undefined };

function createApi(calls: Call[], response: unknown = {}): IHttp {
  return {
    url: API_URL,
    fetchJson: async <TResult>(path: string, opts?: { query?: Record<string, unknown> }) => {
      calls.push({ path, query: opts?.query });
      return response as TResult;
    },
    postJson: async () => {
      throw new Error("Unexpected POST request");
    },
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function getRequestedUrl() {
  const [url] = fetchMock.mock.calls[0] as unknown as [string];
  return new URL(url);
}

describe("protocol stats API params", () => {
  it("passes list filters through as arrays", async () => {
    const calls: Call[] = [];

    await fetchApiProtocolStatsSummary(
      { api: createApi(calls) },
      { networks: ["arbitrum", "solana"], versions: ["v2"] }
    );

    expect(calls).toEqual([
      { path: "/v1/stats/summary", query: { networks: ["arbitrum", "solana"], versions: ["v2"] } },
    ]);
  });

  it("drops empty and missing list filters", async () => {
    const calls: Call[] = [];

    await fetchApiProtocolStatsSummary({ api: createApi(calls) }, { networks: [] });
    await fetchApiProtocolStatsSummary({ api: createApi(calls) });

    expect(calls.map((call) => call.query)).toEqual([
      { networks: undefined, versions: undefined },
      { networks: undefined, versions: undefined },
    ]);
  });

  it("sends the metric, grouping and unix-second bounds of a timeseries", async () => {
    const calls: Call[] = [];

    await fetchApiProtocolStatsTimeseries(
      { api: createApi(calls) },
      { metric: "volume.total", groupBy: "network", from: FROM, to: TO, networks: ["arbitrum"] }
    );

    expect(calls).toEqual([
      {
        path: "/v1/stats/timeseries",
        query: {
          metric: "volume.total",
          groupBy: "network",
          networks: ["arbitrum"],
          versions: undefined,
          from: FROM,
          to: TO,
        },
      },
    ]);
  });

  it("requests the sources without params", async () => {
    const calls: Call[] = [];

    await fetchApiProtocolStatsSources({ api: createApi(calls, []) });

    expect(calls).toEqual([{ path: "/v1/stats/sources", query: undefined }]);
  });
});

describe("protocol stats API query serialization", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse({}));
  });

  it("repeats list filters as separate query params", async () => {
    await fetchApiProtocolStatsSummary(
      { api: new HttpClient(API_URL) },
      { networks: ["arbitrum", "solana"], versions: ["v2"] }
    );

    const url = getRequestedUrl();

    expect(url.origin + url.pathname).toBe(`${API_URL}/v1/stats/summary`);
    expect(url.searchParams.getAll("networks")).toEqual(["arbitrum", "solana"]);
    expect(url.searchParams.getAll("versions")).toEqual(["v2"]);
    expect(url.search).not.toContain(",");
  });

  it("omits empty list filters from the query", async () => {
    await fetchApiProtocolStatsSummary({ api: new HttpClient(API_URL) }, { networks: [] });

    const url = getRequestedUrl();

    expect(url.pathname).toBe("/v1/stats/summary");
    expect(url.searchParams.has("networks")).toBe(false);
    expect(url.searchParams.has("versions")).toBe(false);
  });

  it("serializes timeseries bounds as unix seconds", async () => {
    await fetchApiProtocolStatsTimeseries(
      { api: new HttpClient(API_URL) },
      { metric: "volume.total", groupBy: "network", from: FROM }
    );

    const url = getRequestedUrl();

    expect(url.pathname).toBe("/v1/stats/timeseries");
    expect(url.searchParams.get("metric")).toBe("volume.total");
    expect(url.searchParams.get("groupBy")).toBe("network");
    expect(url.searchParams.get("from")).toBe(String(FROM));
    expect(url.searchParams.has("to")).toBe(false);
    expect(url.searchParams.has("networks")).toBe(false);
  });
});
