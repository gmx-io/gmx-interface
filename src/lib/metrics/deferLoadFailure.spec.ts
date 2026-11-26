import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";

import { deferLoadFailure } from "./deferLoadFailure";
import { metrics } from "./Metrics";
import type { LoadFallbackOutcome, LoadingFailedEvent } from "./types";

type PostedItem = { payload: { event: string; customFields?: Partial<LoadFallbackOutcome> } };

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  EventTarget.prototype.dispatchEvent.call(document, new Event("visibilitychange"));
}

describe("deferLoadFailure", () => {
  let posts: { at: number; keepalive: boolean; events: ({ event: string } & Partial<LoadFallbackOutcome>)[] }[] = [];
  let emptyPostsCount = 0;
  let nextPostFailure: "500" | "400" | "networkError" | undefined;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    posts = [];
    emptyPostsCount = 0;
    nextPostFailure = undefined;
    metrics.initGlobalPropsRetries = 0;
    metrics.setFetcher({
      fetchPostBatchReport: async ({ items }: { items: PostedItem[] }, opts?: { keepalive?: boolean }) => {
        const failure = nextPostFailure;
        nextPostFailure = undefined;

        if (failure === "networkError") {
          throw new TypeError("Failed to fetch");
        }

        if (failure) {
          return new Response("", { status: Number(failure) });
        }

        const failedItems = items.filter(({ payload }) => payload.event.endsWith(".failed"));
        emptyPostsCount += items.length === 0 ? 1 : 0;

        if (failedItems.length > 0) {
          posts.push({
            at: Date.now(),
            keepalive: Boolean(opts?.keepalive),
            events: failedItems.map(({ payload: { event, customFields } }) => ({
              event,
              fallbackLoaded: customFields?.fallbackLoaded,
              fallbackTime: customFields?.fallbackTime,
              fallbackWaitEnd: customFields?.fallbackWaitEnd,
            })),
          });
        }

        return new Response("{}");
      },
    } as unknown as OracleFetcher);
  });

  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    setVisibility("visible");
    vi.clearAllTimers();
    vi.useRealTimers();
    metrics.fetcher = undefined;
    metrics.queue = [];
    metrics.releasedDeferredItems = [];
    metrics.isProcessing = false;
    metrics.isSendFailing = false;
    metrics.initGlobalPropsRetries = 3;
  });

  it.each([
    {
      name: "fallback loads before the next batch",
      at: 1000,
      action: "load",
      backlog: 0,
      postedAt: 3000,
      keepalive: false,
      end: "loaded",
    },
    {
      name: "fallback loads after the next batch",
      at: 4000,
      action: "load",
      backlog: 0,
      postedAt: 4000,
      keepalive: true,
      end: "loaded",
    },
    {
      name: "page is hidden before the next batch",
      at: 1000,
      action: "hide",
      backlog: 0,
      postedAt: 3000,
      keepalive: false,
      end: "pageHidden",
    },
    {
      name: "page is hidden after the next batch",
      at: 4000,
      action: "hide",
      backlog: 0,
      postedAt: 4000,
      keepalive: true,
      end: "pageHidden",
    },
    {
      name: "fallback does not load",
      at: 10_000,
      action: "none",
      backlog: 0,
      postedAt: 12_000,
      keepalive: false,
      end: "timeout",
    },
    {
      name: "fallback does not load, with a full batch queued",
      at: 10_000,
      action: "none",
      backlog: 150,
      postedAt: 12_000,
      keepalive: false,
      end: "timeout",
    },
  ])(
    "sends a failed load event once with the fallback outcome: at once when the fallback loads, otherwise within a batch interval TRD-33: $name",
    async ({ at, action, backlog, postedAt, keepalive, end }) => {
      const failure = deferLoadFailure({
        event: "marketsInfoLoad.failed",
        isError: true,
        time: 100,
        data: { requestId: "1" },
      });

      await vi.advanceTimersByTimeAsync(at);

      Array.from({ length: backlog }).forEach(() => metrics.pushCounter<{ event: "test.counter" }>("test.counter"));

      if (action === "load") {
        failure.onLoaded();
      } else if (action === "hide") {
        setVisibility("hidden");
      }

      await vi.advanceTimersByTimeAsync(20_000 - at);

      expect(posts).toEqual([
        {
          at: postedAt,
          keepalive,
          events: [
            {
              event: "marketsInfoLoad.failed",
              fallbackLoaded: end === "loaded",
              fallbackTime: at,
              fallbackWaitEnd: end,
            },
          ],
        },
      ]);
      expect(emptyPostsCount).toBe(0);
    }
  );

  it.each([
    { name: "a 500 before the load", failAt: 3500, failure: "500", loadAt: 7000, postedAt: 9000, keepalive: false },
    {
      name: "a network error before the load",
      failAt: 3500,
      failure: "networkError",
      loadAt: 7000,
      postedAt: 9000,
      keepalive: false,
    },
    { name: "a 400 before the load", failAt: 3500, failure: "400", loadAt: 7000, postedAt: 7000, keepalive: true },
    {
      name: "a 500 and a recovery before the load",
      failAt: 3500,
      failure: "500",
      loadAt: 9500,
      postedAt: 9500,
      keepalive: true,
    },
    {
      name: "a network error on the batch that carries the event",
      failAt: 0,
      failure: "networkError",
      loadAt: 1000,
      postedAt: 9000,
      keepalive: false,
    },
  ] as const)(
    "sends a failed load event once and only with the batch loop while metrics requests fail TRD-33: $name",
    async ({ failAt, failure, loadAt, postedAt, keepalive }) => {
      const failedLoad = deferLoadFailure({
        event: "marketsInfoLoad.failed",
        isError: true,
        time: 100,
        data: { requestId: "1" },
      });

      await vi.advanceTimersByTimeAsync(failAt);
      nextPostFailure = failure;

      if (failAt > 0) {
        metrics.pushCounter<{ event: "test.counter" }>("test.counter");
      }

      await vi.advanceTimersByTimeAsync(loadAt - failAt);
      failedLoad.onLoaded();
      await vi.advanceTimersByTimeAsync(20_000 - loadAt);

      expect(posts.map((post) => [post.at, post.keepalive])).toEqual([[postedAt, keepalive]]);
    }
  );

  it("sends failed load events whose fallback loads in one task in one request TRD-33", async () => {
    const failures = ["marketsInfoLoad.failed", "positionsListLoad.failed"].map((event) =>
      deferLoadFailure({
        event: event as LoadingFailedEvent["event"],
        isError: true,
        time: 100,
        data: { requestId: "1" },
      })
    );

    await vi.advanceTimersByTimeAsync(4000);
    failures.forEach((failure) => failure.onLoaded());
    await vi.advanceTimersByTimeAsync(0);

    expect(posts.map(({ at, events }) => [at, events.length])).toEqual([[4000, 2]]);
  });
});
