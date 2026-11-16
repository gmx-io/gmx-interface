import { afterEach, describe, expect, it, vi } from "vitest";

import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";

import { metrics } from "./Metrics";

vi.mock("lib/sleep", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lib/sleep")>()),
  sleep: () => new Promise<void>(() => undefined),
}));

describe("Metrics batch sending", () => {
  afterEach(() => {
    metrics.fetcher = undefined;
    metrics.queue = [];
    metrics.isProcessing = false;
    metrics.initGlobalPropsRetries = 3;
  });

  it.each([JSON.stringify({ message: "invalid item" }), "<html><body>400 Bad Request</body></html>"])(
    "drops a batch rejected with 400 and reports it instead of re-sending it forever PRO-4393: %s",
    async (body) => {
      metrics.fetcher = {
        fetchPostBatchReport: async () => new Response(body, { status: 400 }),
      } as unknown as OracleFetcher;
      metrics.initGlobalPropsRetries = 0;
      metrics.pushCounter<{ event: "test.counter" }>("test.counter");

      metrics._processQueue();

      await vi.waitFor(() =>
        expect(metrics.queue).toEqual([
          expect.objectContaining({
            type: "event",
            payload: expect.objectContaining({
              event: "error",
              customFields: expect.objectContaining({ errorSource: "Metrics" }),
            }),
          }),
        ])
      );
    }
  );
});
